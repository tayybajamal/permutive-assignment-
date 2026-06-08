# Permutive's Customer Engineer Challenge

This exercise is used to help us evaluate candidates looking to join Permutive in a Customer Engineer role. We hope a take-home exercise offers you a fairer shot at demonstrating your technical ability: you'll be more relaxed than in an interview situation, and you'll be able to look-up things online—something we all do when working in the real world! 😊

We'll review your solution based on its functional correctness, ease-of-understanding and clearly stated assumptions. If successful, we'll progress you to the next stage which will be a discussion about your solution where you'll have the opportunity to explain your approach and reason about the decisions you've made. We may also have questions about how you would adapt your solution given new information about requirements or constraints.

Please don't worry too much about submitting a perfect, production-ready solution. The most important outcome is that we are able to have a conversation about your solution in the next interview stage. Note that if you progress to our next stage, we would ask you to share your screen during the interview and demo what you've built.

You are welcome to use AI-assisted development tools (e.g. GitHub Copilot, ChatGPT, Claude) to help you work through this challenge. This reflects how we work day-to-day, and we're more interested in your ability to understand and reason about the solution than whether you wrote every line by hand.

Hopefully it goes without saying, but please don't share this exercise. 👀

## Instructions

- A starter project has been provided for you. The project uses **TypeScript** and **Express**. Please build your solution on top of this starter code — the taxonomy endpoint has already been implemented for you.

- To get started, install the dependencies and run the development server:

  ```bash
  npm install
  npm run dev
  ```

- You will need to deploy your API to a publicly accessible hosted environment so that we can see it running on real infrastructure. Feel free to use your choice of cloud infrastructure provider (e.g. AWS, Google Cloud, etc.) or serverless platform (e.g. Vercel, Render, Railway, Cloudflare, etc.) for this purpose. Most cloud providers and serverless platforms offer free trials that are sufficient for this challenge. Please document any steps you take to deploy your solution.

- When you're done, please create a pull request into the `master` branch of this repo with your solution. Alongside your solution, please fill in the provided `NOTES.md` template with documentation about your solution.

- We anticipate this exercise to take between 2-3 hours in total. Please don't spend longer than 3 hours on this exercise. If you feel as though there were things you would have liked to include given more time, please let us know in your written notes.

## Scenario

We are in the process of onboarding a new Permutive customer, The Daily Quill. They have approached us about a key requirement that was previously discussed with them during the sales cycle: they want to bring their own contextual data into Permutive so that they can leverage it in the Permutive platform.

Typically, Permutive collects article attributes (e.g. `category`) from the page when a customer implements Permutive's SDK on their website. However, for The Daily Quill, their contextual data is not available on-page so they are unable to send it into Permutive as part of their deployment. Instead, they would like Permutive to integrate with their internal database to retrieve contextual data and make it available for targeting via Permutive cohorts.

Following some internal conversations with our Product & Engineering team, you've identified that the best way to integrate contextual data into Permutive is to leverage Permutive's existing Contextual Data Platform. You've also found that this platform supports a Webhook extension, which can be used to onboard custom contextual data from an API.

You are now tasked with implementing a solution which integrates The Daily Quill's contextual data into the Permutive platform.

## The Daily Quill's Contextual Data

The Daily Quill store their contextual data in a Google Cloud Platform (GCP) product called Firestore. The database is located in the customer's GCP project (for the purposes of this exercise, the project ID is `permutive-tech-challenges`). The customer has provided the following details about their Firestore database instance:

- Firestore database name: `projects/permutive-tech-challenges/databases/(default)`
- Firestore collection name: `tdc_article_categories`

The Firestore collection contains a collection of documents where the document ID corresponds to an article ID. Each document contains two attributes, a `url` (string) representing the article URL and a `categories` (array of strings) containing a list of category IDs for the article. These categories represent the contextual data which The Daily Quill wants to leverage in Permutive.

For The Daily Quill, their category IDs correspond to category IDs from the IAB Content Taxonomy 3.1. We have included a TSV file containing this taxonomy [here](assets/iab_content_taxonomy.tsv), consisting of category IDs and their corresponding human readable names. These human readable names are what's displayed in parts of the Permutive product where contextual data is used to provide an improved user experience over raw category IDs.

This is a screenshot of the Firestore instance in the GCP UI:

<p align="center">
<img width="1000" src="https://storage.googleapis.com/permutive-tech-challenges-assets/firestore-ui.png" />
</p>

In this example, the article with URL `https://www.thedailyquill.com/article/global-economy-533612/` has article ID `533612` and has three associated category IDs: `65`, `66` and `77`.

## Permutive's Contextual Data Platform

### Architecture

When a customer deploys Permutive, Permutive begins to collect events (such as `Pageview`) as users visit their website or apps.

Permutive's Contextual Data Platform provides a way to enrich these events with additional contextual data about the content being viewed. This infrastructure is underpinned by a Scala service and Bigtable datastore, where contextual data is cached. Contextual Data Provider integrations can be plugged into this platform, enabling the onboarding of contextual data from various third-party data providers.

<p align="center">
<img width="900" src="https://storage.googleapis.com/permutive-tech-challenges-assets/cdp-1.png" />
</p>

### Webhook Extension

Permutive's Contextual Data Platform supports a Webhook extension, which is a specific type of Contextual Data Provider integration that can be used to onboard custom contextual data from an API which conforms to the specification expected by the Webhook extension. The Webhook extension is treated as a Contextual Data Provider:

<p align="center">
<img width="400" src="https://storage.googleapis.com/permutive-tech-challenges-assets/cdp-2.png" />
</p>

To set up the Webhook extension, an API endpoint must be provided which the Contextual Data Platform will communicate with.

The starter project already implements the taxonomy endpoint for you. Your task is to implement the **classify** endpoint, which retrieves categories for a given URL from The Daily Quill's Firestore database.

This endpoint must support two types of request and its responses must conform to what's expected by the Contextual Data Platform:

**1. Retrieve Taxonomy (already implemented)**

When a new Webhook extension is setup for a customer, the Contextual Data Platform will send a `taxonomies` request to retrieve the taxonomy for the contextual data. This is typically a one off registration process. The taxonomy describes the range of contextual data supported by the data provider, providing the category IDs and their corresponding human readable names.

Expected Request:

```
{
    "type": "taxonomies"
}
```

Expected Response (Example):

```
[
  {
    "id": "iab_3_1",
    "name": "IAB 3.1 Content Taxonomy",
    "values": [
      {
        "id": "1",
        "name": "Automotive"
      },
      {
        "id": "2",
        "name": "Auto Body Styles"
      },
      {
        "id": "3",
        "name": "Commercial Trucks"
      },
      ...
    ]
  }
]
```

**2. Retrieve Categories for URL (your task)**

Once your Webhook data provider is active, the Contextual Data Platform will send `classify` requests to retrieve the categories for a URL. These requests will be higher in frequency, as they are sent when a new URL is observed which the Contextual Data Platform has no stored categories. For example, if the customer publishes a new article which Permutive begins to receive data for, the Contextual Data Platform will make a request to classify the article URL.

Expected Request (Example):

```
{
    "type": "classify",
    "url": "https://www.thedailyquill.com/article/global-economy-533612/"
}
```

Expected Response (Example):

```
{
  "classifications": [
    {
      "type": "categories",
      "value": "1",
      "taxonomy": "iab_3_1"
    },
    {
      "type": "categories",
      "value": "3",
      "taxonomy": "iab_3_1"
    }
  ]
}
```

Note that while the Contextual Data Platform is able to support several types of contextual data, `categories` is the only type relevant to The Daily Quill. Also note that the `taxonomy` identifier in these classifications must match with the taxonomy `id` returned when taxonomies are requested.

## Testing Your Solution

The Webhook extension can be configured for a Permutive project, by visiting the [Contextual Catalog](https://dash.permutive.com/contextual/catalog) in the Permutive dashboard. From this page, you can enable the Webhook extension by providing a URL for the API endpoint. When doing this, please do not select any options for 'Standard Taxonomies' and select only _Categories_ under 'Requested Types'.

<p align="center">
<img width="800" src="https://storage.googleapis.com/permutive-tech-challenges-assets/webhook-setup.png" />
</p>

When you enable the Webhook extension, a call will be made to your webhook endpoint to retrieve the taxonomy. Please note that you'll see an error at this stage if your endpoint does not return a valid response.

Once enabled, the integration can be tested end-to-end by using the "preview" capability, which enables you to trigger a `classify` request for a provided URL and view the categories returned:

<p align="center">
<img width="600" src="https://storage.googleapis.com/permutive-tech-challenges-assets/webhook-preview.png" />
</p>

Additionally, you should be able to create contextual cohorts using the contextual data taxonomy:

<p align="center">
<img width="700" src="https://storage.googleapis.com/permutive-tech-challenges-assets/contextual-cohort-builder.png" />
</p>

## Additional Resources

To complete this exercise, you'll need:

- Access to The Daily Quill's project within the Permutive dashboard. An invitation will be sent to your email address.
- GCP service account key for a service account with permissions to read from The Daily Quill's Firestore instance. This will be sent to you via email.
