#!/usr/bin/env ts-node

import axios from "axios";
import { exit } from "process";

interface EventTriggerRequestBody {
  context: {
    eventId: string;
    timestamp: string;
    eventType: string;
    resource: {
      service: string;
      name: string;
      type: string;
    };
  };
  data: {
    "@type": string;
    attributes: { [key: string]: any };
    data: string; //base64 encoded
  };
}

const encode = (str: string): string =>
  Buffer.from(str, "binary").toString("base64");

interface PostFetchedOutputMessage {
  id: string;
  title: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  publicationId: string;
  url: string;
}

// const message: PostFetchedOutputMessage = {
//   id: "185976c940eb141db4cfffb9c0547875",
//   title:
//     "First Mover Americas: Bitcoin Falls to $18.1K After CPI Data",
//   tags: ["markets"],
//   publishedAt: "2022-10-13T08:51:19.000Z",
//   updatedAt: "2022-10-13T08:51:19.000Z",
//   publicationId: "coindesk",
//   url: "https://www.coindesk.com/markets/2022/10/13/first-mover-americas-bitcoin-falls-to-181k-after-cpi-data-huobis-ht-surges-70-since-monday/",
// };

// const message: PostFetchedOutputMessage = {
//   id: "185976c940eb141db4cfffb9c0547875",
//   title:
//     "Skype Co-Founder Leads $13M Investment in Liquid-Cooled Bitcoin Mining Tech",
//   tags: ["tech"],
//   publishedAt: "2022-10-13T08:51:19.000Z",
//   updatedAt: "2022-10-13T08:51:19.000Z",
//   publicationId: "decrypt",
//   url: "https://decrypt.co/111883/skype-cofounder-fabric-liquid-cooled-bitcoin-mining",
// };

// const message: PostFetchedOutputMessage = {
//   id: "185976c940eb141db4cfffb9c0547875",
//   title:
//     "Bitcoin Volatility Falls to Two-Year Low as TradFi Markets Wobble",
//   tags: ["tech"],
//   publishedAt: "2022-10-13T08:51:19.000Z",
//   updatedAt: "2022-10-13T08:51:19.000Z",
//   publicationId: "decrypt",
//   url: "https://decrypt.co/112174/bitcoin-volatility-falls-to-two-year-low-as-tradfi-markets-wobble",
// };

const message: PostFetchedOutputMessage = {
  id: "185976c940eb141db4cfffb9c0547875",
  title:
    "North Koreas Lazarus Group Attacks Japanese Crypto Firms",
  tags: ["business"],
  publishedAt: "2022-10-13T08:51:19.000Z",
  updatedAt: "2022-10-13T08:51:19.000Z",
  publicationId: "decrypt",
  url: "https://decrypt.co/112130/north-koreas-lazarus-group-attacks-japanese-crypto-firms",
};


const request: EventTriggerRequestBody = {
  context: {
    eventId: "1144231683168617",
    timestamp: "2020-05-06T07:33:34.556Z",
    eventType: "google.pubsub.topic.publish",
    resource: {
      service: "pubsub.googleapis.com",
      name: "projects/sample-project/topics/post-fetched",
      type: "type.googleapis.com/google.pubsub.v1.PubsubMessage",
    },
  },
  data: {
    "@type": "type.googleapis.com/google.pubsub.v1.PubsubMessage",
    attributes: {
      attr1: "attr1-value",
    },
    data: encode(JSON.stringify(message)),
  },
};

const sendRequest = async (): Promise<void> => {
  await axios.post(`http://localhost:8080/`, request);
};

sendRequest().then(() => {
  console.log("Finished");
  process.exit();
});
