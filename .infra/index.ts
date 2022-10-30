import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

import { createPubSubTopics } from "./topics";
import { createGCPFunctions } from "./functions";


// Create a GCP resource (Storage Bucket)
const bucket = new gcp.storage.Bucket("bitdispatch-functions", {
    location: "US"
});

// Export the DNS name of the bucket
export const bucketName = bucket.url;


export const topics = createPubSubTopics();

export const functions = createGCPFunctions(bucket);

export const webhookUrl = functions.find((func) => func.name.toString() === 'webhook')?.httpsTriggerUrl
console.log("Webhook Trigger URL: ", webhookUrl)