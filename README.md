# Bitdispatch Functions

This repo contains all serverless GCP functions


## Functions

`webhook`
- Accepts POST requests from superfeeder on new post on RSS feeds
- Publishes message to `post-fetched` topic

`crawler`
- Triggered by message on `post-fetched` topic
- Scrapes metadata and performs topic extraction using OneAi
- Publishes message to `crawled-post` topic

`imager`
- Triggered by message on `crawled-post` topic
- Scrapes image and stores in cloudinary
- Publishes message to `post-image-processed` topic (which triggers ingestion into DB)


## Usage

See `Makefile` for running functions locally

### Mock Event Scripts
`./ops/` contains scripts to trigger each function appropriately

Prerequisites: 
- `ts-node` 
- `axios`


## Deployment

Pulumi is used to manage GCP infrastructure and deployment of functions.
This is managed in the `.infra/` directory.

`pulumi preview` to see resources that will be created