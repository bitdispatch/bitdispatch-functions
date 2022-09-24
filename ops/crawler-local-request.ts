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

const message: PostFetchedOutputMessage = {
  id: "185976c940eb141db4cfffb9c0547875",
  title:
    "Former Korean Finance Minister Joins Hashed Open Research to Promote Blockchain",
  tags: ["industry"],
  publishedAt: "2022-08-28T12:02:19.000Z",
  updatedAt: "2022-08-28T12:02:19.000Z",
  publicationId: "bitcoinist",
  url: "https://bitcoinist.com/former-korean-finance-minister-joins-hashed-open-research-to-promote-blockchain/",
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
