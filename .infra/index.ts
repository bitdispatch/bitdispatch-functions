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


// todo - load topics from externalized config?
export const topics = createPubSubTopics();

export const functions = createGCPFunctions(bucket);
