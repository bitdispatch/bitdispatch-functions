import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as fs from "fs";
import { FileArchive } from "@pulumi/pulumi/asset";

function loadEnvVars(path: string, env: string): { [key: string]: any } {
  const envFile = `.env.${env}.json`;
  let data = {};
  try {
    data = require(`${path}${envFile}`);
  } catch (e) {
    console.log(e);
  }
  return data;
}

function getDistFiles(path: string): string[] {
  let ignoreFiles: string[] = [];
  const fileName = `${path}/.gcloudignore`;
  let fileContent = fs.readFileSync(fileName, "utf-8");

  for (const line of fileContent.split(/[\r\n]+/)) {
    if (!line.startsWith("#")) {
      ignoreFiles.push(line.trim());
    }
  }

  let distFiles: string[] = [];
  fs.readdirSync(path).forEach((file) => {
    if (!ignoreFiles.includes(file)) {
      distFiles.push(file);
    }
  });

  return distFiles;
}

function createDist(path: string): FileArchive {
  const distPath = `${path}dist/`;

  //create dist dir if not exists
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath);
  }

  // copy files to dist folder
  getDistFiles(path).forEach((file) => {
    fs.copyFileSync(`${path}${file}`, `${distPath}${file}`);

  });

  return new FileArchive(distPath);
}

export function createGCPFunctions(
  bucket: gcp.storage.Bucket
): gcp.cloudfunctions.Function[] {
  return functions.map((func) => {
    const distArchive = createDist(func.path);

    const archive = new gcp.storage.BucketObject(func.name, {
      bucket: bucket.name,
      source: distArchive,
    });

    return new gcp.cloudfunctions.Function(func.name, {
      description: func.description,
      runtime: func.runtime,
      availableMemoryMb: func.availableMemoryMb ?? 128,
      triggerHttp: func.triggerHttp ?? false,
      environmentVariables: loadEnvVars(func.path, pulumi.getStack()),
      eventTrigger: func.eventTrigger,
      sourceArchiveBucket: bucket.name,
      sourceArchiveObject: archive.name,
      labels: {
        env: pulumi.getStack(),
        ...func.labels
      }
    });
  });
}

interface FunctionConfig {
  name: string;
  path: string;
  project?: string;
  description?: string;
  runtime: string;
  availableMemoryMb?: number;
  buildEnvironmentVariables?: { [key: string]: any };
  environmentVariables?: { [key: string]: any };
  eventTrigger?: {
    eventType: string;
    resource: string;
    failurePolicy?: { retry: boolean };
  };
  httpsTriggerSecurityLevel?: string;
  httpsTriggerUrl?: string;
  ingressSettings?: string;
  kmsKeyName?: string;
  labels?: { [key: string]: any }; // do not include `env` key - dynamically added in execution
  maxInstances?: number;
  minInstances?: number;
  secretEnvironmentVariables?: {
    key: string;
    secret: string;
    version: string;
    projectId?: string;
  };
  secretVolumes?: {};
  serviceAccountEmail?: string;
  sourceArchiveBucket?: string;
  sourceArchiveObject?: string;
  timeout?: number;
  triggerHttp?: boolean;
  vpcConnector?: string;
  vpcConnectorEgressSettings?: string;
}

export const functions: FunctionConfig[] = [
  {
    name: "webhook",
    path: "../webhook/",
    runtime: "nodejs16",
    triggerHttp: true,
    labels: {
      'trigger-event': 'external-http',
      'trigger-resource': 'superfeeder',
      'publish-topic': 'post-fetched'
    }
  },
  {
    name: "crawler",
    path: "../crawler/",
    runtime: "nodejs16",
    triggerHttp: true,
    labels: {
      'trigger-event': 'google.pubsub.topic.publish',
      'trigger-resource': 'post-fetched',
      'publish-topic': 'crawled-post'
    }
  },
  {
    name: "imager",
    path: "../imager/",
    runtime: "nodejs16",
    triggerHttp: true,
    labels: {
      'trigger-event': 'google.pubsub.topic.publish',
      'trigger-resource': 'post-keywords-extracted', //todo change to crawled-post
      'publish-topic': 'post-image-processed'
    }
  },
];
