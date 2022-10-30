import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import {PROJECT_LABELS} from "./labels";

export function createPubSubTopics(): gcp.pubsub.Topic[] {
  return topics.map(
    (topic) =>
      new gcp.pubsub.Topic(topic.name, {
        labels: topic.labels,
      })
  );
}

interface TopicConfig {
  name: string;
  labels?: { [key: string]: any };
}

export const topics: TopicConfig[] = [
  {
    name: "crawled-post", 
    labels: {
      producer: "crawler",
      consumer: "imager",
      ...PROJECT_LABELS
    },
  },
  // {
  //   name: "post-keywords-extracted",
  //   labels: {
  //     producer: "imager/utils",
  //     triggers: "imager",
  //   },
  // },
  {
    name: "post-fetched",
    labels: {
      producer: "webhook",
      triggers: "crawler",
      ...PROJECT_LABELS
    },
  },
];
