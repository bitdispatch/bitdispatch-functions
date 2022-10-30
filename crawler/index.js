const got = require("got");
const langDetector = new (require("languagedetect"))();
const metascraper = require("metascraper").load([
  require("metascraper-date")(),
  require("metascraper-url")(),
  require("./rules")(),
]);
const { PubSub } = require(`@google-cloud/pubsub`);
const pubsub = new PubSub();
const duplicateTags = require("./duplicate_tags");
const ignoredTags = require("./ignored_tags");
const ignoredCryptocurrencies = require("./ignored_cryptocurrencies");
const pubTags = require("./pub_tags");
const bitcoinTerms = require("./bitcoin_tags");
const topic = pubsub.topic("crawled-post");
// const OneAi = require('oneai');
// const oneaiClient = new OneAi(process.env.ONEAI_API_KEY);

const specificMetaFixes = (pubId, url, meta) => {
  switch (pubId) {
    case "addy":
      // Addy Osmani blog has wrong twitter:url tag
      return Object.assign({}, meta, { url });
    case "bair":
      // BAIR has wrong image url in the meta tags
      return Object.assign({}, meta, {
        image: meta.image.replace("blogassets", "blog/assets"),
      });
    default:
      return meta;
  }
};

const formatMeta = (meta) =>
  Object.assign({}, meta, {
    readTime: meta.readTime ? Math.ceil(meta.readTime.duration) : null,
    paid: meta.paid === "true",
    isMediumComment: meta.isMediumComment === "true",
  });

const extractMetaTags = (pubId, url) =>
  got(url)
    .then(({ body: html, url }) => metascraper({ html, url }))
    .then((res) => specificMetaFixes(pubId, url, formatMeta(res)));

const convertTagsToSchema = (tags) => {
  const obj = Object.assign({}, tags);
  if (obj.date) {
    obj.publishedAt = new Date(obj.date);
  }
  delete obj.date;
  if (obj.modified) {
    obj.updatedAt = new Date(obj.modified);
  }
  delete obj.modified;
  if (obj.keywords) {
    obj.tags = obj.keywords;
  }
  delete obj.keywords;
  return obj;
};

const getIfTrue = (cond, key, value) => (cond ? { [key]: value } : {});

const processTags = (data) => {
  let tags = data.tags || [];
  if (data.tags && data.tags.length) {
    tags = data.tags
      .map((t) => {
        const newT = t.toLowerCase().split("&")[0].trim().replace(/ /g, "-");
        if (duplicateTags[newT]) {
          return duplicateTags[newT];
        }
        if (bitcoinTerms[newT]) {
          return bitcoinTerms[newT]
        }
        return newT;
      })
      .filter((t) => t.length > 0 && ignoredTags.indexOf(t) < 0 && ignoredCryptocurrencies.indexOf(t) < 0);
  }
  if (pubTags[data.publicationId]) {
    tags = tags.concat(pubTags[data.publicationId]);
  }

  tags = Array.from(new Set(tags));
  return Object.assign({}, data, { tags });
};

const extractTopics = async (item) => {
  if (item === undefined) {
    // if post has been filtered out due to previous rules, exit
    return null
  }

  //hardcode certain topics to always be pulled from title
  title_keywords = Object.keys(bitcoinTerms).filter((key) =>
    item.title.toLowerCase().indexOf(key) > 0).map((key) =>
      bitcoinTerms[key])

  // todo - analyze description / content tags?

  //One Ai for automated topic extraction
  //disabled for now to save costs 
  // console.log('extracting topics using OneAi...')
  // const pipeline = new oneaiClient.Pipeline(
  //   oneaiClient.skills.htmlToArticle(),
  //   oneaiClient.skills.topics()
  // )
  // const data = await pipeline.run(item.url)
  // const topics = data.htmlArticle.topics.map(i => i.value.toLowerCase())

  const topics = []


  //combine new tags with existing tags
  item.tags = [].concat(item.tags, title_keywords, topics)
  return processTags(item)
}

function isEnglish(text) {
  const langs = langDetector.detect(text, 10);
  return !!langs.find((l) => l[0] === "english");
}

function containsCryptocurrencyInTitle(text) {
  hasCryptoInTitle = false
  ignoredCryptocurrencies.map((i) => {
    if (text.toLowerCase().includes(" " + i + " ")) {
      hasCryptoInTitle = true
      console.log('contains in title: ', i)
    }
  })
  return hasCryptoInTitle
}

exports.crawler = (event) => {
  //handle local testing event
  const message = event.data || event.body.data.data;
  const data = JSON.parse(Buffer.from(message, "base64").toString());
  // Get rid of source=rss* added by Medium
  data.url = data.url.replace(/\?source=rss(.*)/, "");

  console.log(`[${data.id}] scraping ${data.url} to enrich`, data);

  return extractMetaTags(data.publicationId, data.url)
    .then(convertTagsToSchema)
    .then((tags) =>
      Object.assign(
        {},
        data,
        tags,
        getIfTrue(data.title && data.title.length < 255, "title", data.title),
        getIfTrue(data.tags && data.tags.length > 0, "tags", data.tags)
      )
    )
    .catch((err) => {
      if (err.statusCode === 404) {
        console.info(`[${data.id}] post doesn't exist anymore ${data.url}`);
        return null;
      }

      console.warn(`[${data.id}] failed to scrape ${data.url}`, err);
      return data;
    })
    .then(processTags)
    .then((item) => {
      if (!item) {
        return Promise.resolve();
      }

      if (item.paid) {
        console.log(`[${data.id}] paid content is ignored`, item);
        return Promise.resolve();
      }

      if (item.isMediumComment && item.url.indexOf("medium.com") >= 0) {
        console.log(`[${data.id}] medium comment is ignored`, item);
        return Promise.resolve();
      }

      if (!isEnglish(item.title)) {
        console.log(`[${data.id}] non-english content is ignored`, item);
        return Promise.resolve();
      }

      if (item.tags && item.tags.indexOf("sponsored") > -1) {
        console.log(`[${data.id}] sponsored content is ignored`, item);
        return Promise.resolve();
      }

      if (containsCryptocurrencyInTitle(item.title)) {
        console.log(`[${data.id}] post with a cryptocurrency in title is ignored`, item);
        return Promise.resolve();
      }
      // console.log(`[${data.id}] crawled post`, item);
      // return topic.publish(Buffer.from(JSON.stringify(item)));
      return item
    })
    .then(extractTopics)
    .then(processTags)
    .then((item) => {
      if (!item) {
        return Promise.resolve();
      }

      console.log(`[${data.id}] crawled post`, item);
      return topic.publish(Buffer.from(JSON.stringify(item)));
    });
};

// const publicationId = 'dc';
// extractMetaTags(publicationId, 'https://firebase.googleblog.com/2020/03/firebase-kotlin-ga.html')
//   .then(convertTagsToSchema)
//   .then(data => processTags({ ...data, publicationId }))
//   .then(console.log)
//   .catch(console.error);
