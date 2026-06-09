import express from "express";
import { getTaxonomies } from "./taxonomy";
import { Firestore } from "@google-cloud/firestore";
import * as path from "path";

type WebhookRequest =
  | { type: "taxonomies" }
  | { type: "classify"; url: string };

const PROJECT_ID = "permutive-tech-challenges";
const KEY_FILE = "permutive-tech-challenges-tayybajamal.json";

function createFirestore(): Firestore {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (credentialsJson) {
    return new Firestore({
      projectId: PROJECT_ID,
      credentials: JSON.parse(credentialsJson),
      databaseId: "(default)",
    });
  }

  return new Firestore({
    projectId: PROJECT_ID,
    keyFilename: path.join(process.cwd(), KEY_FILE),
    databaseId: "(default)",
  });
}

const app = express();
app.use(express.json());

const db = createFirestore();

app.post("/webhook", async (request, response) => {
  const body = request.body as WebhookRequest;

  if (body.type === "taxonomies") {
    const taxonomies = getTaxonomies();
    return response.json(taxonomies);
  }

  if (body.type === "classify") {
    try {
      const { url } = body;

      let url1 = url;
      if (url1.endsWith("/")) {
        url1 = url1.slice(0, -1);
      }

      const urlParts = url1.split("-");
      const articleId = urlParts[urlParts.length - 1];

      if (!articleId || isNaN(Number(articleId))) {
        return response.json({ classifications: [] });
      }

      const docRef = db.collection("tdc_article_categories").doc(articleId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return response.json({ classifications: [] });
      }

      const articleData = docSnap.data();
      const rawCategories = articleData?.categories;

      const taxonomiesList = getTaxonomies();
      const dynamicTaxonomyId = taxonomiesList[0]?.id;

      const structuredOutput = [];

      if (rawCategories) {
        for (let i = 0; i < rawCategories.length; i++) {
          const currentCategoryNumber = rawCategories[i];

          structuredOutput.push({
            type: "categories",
            value: String(currentCategoryNumber),
            taxonomy: dynamicTaxonomyId,
          });
        }
      }

      return response.json({ classifications: structuredOutput });
    } catch (error) {
      console.error("Error processing classify request:", error);
      return response.status(500).json({ error: "Internal Server Error" });
    }
  }

  return response.status(400).json({
    error: `Unknown request type: ${(request.body as { type?: string }).type ?? "unknown"}`,
  });
});

export default app;
