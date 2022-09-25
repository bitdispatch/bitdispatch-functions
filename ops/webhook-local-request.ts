#!/usr/bin/env ts-node

import axios from "axios";
import crypto from "crypto";

const secret = require("../webhook/.env.local.json");

const getSignature = (body: any): string => {
  const hmac = crypto.createHmac("sha1", secret.WEBHOOK_SECRET);
  const sig = `sha1=${hmac.update(JSON.stringify(body)).digest("hex")}`;
  return sig;
};

interface RSSItem {
  id: string;
  title: string;
  categories: string[];
  published: number;
  updated: number;
  permalinkUrl: string;
}

const items: RSSItem[] = [
  {
    id: "1",
    title: "mytesttitle",
    categories: ["cat1", "cat2"],
    published: Date.now(),
    updated: Date.now(),
    permalinkUrl:
      "https://stackabuse.com/how-to-send-headers-with-an-axios-post-request/",
  },
  {
    id: "https://bitcoinist.com/?p=193120",
    title:
      "Former Korean Finance Minister Joins Hashed Open Research to Promote Blockchain",
    permalinkUrl:
      "https://bitcoinist.com/former-korean-finance-minister-joins-hashed-open-research-to-promote-blockchain/",
    categories: ["industry"],
    published: 1661688139,
    updated: 1661688139,
  },
];

const sendRequest = async (pubId: string): Promise<any> => {
  const body = { items: items };

  const res = await axios.post(`http://localhost:8080/${pubId}`, body, {
    headers: { "x-hub-signature": getSignature(body) },
  });
  return res;
};

sendRequest("bitcoinist")
  .then(() => {
    console.log(`Sent ${items.length} mock posts`);
  })
  .catch(console.log);

// mock multiple pubIds with real posts from each source
