import express from "express";
import { getTaxonomies } from "./taxonomy";
import { Firestore } from "@google-cloud/firestore";
import * as path from "path";

type WebhookRequest =
  | { type: "taxonomies" }
  | { type: "classify"; url: string };

const app = express();
app.use(express.json());

const file = 'permutive-tech-challenges-tayybajamal.json';
const path1 = path.join(process.cwd(), file);

const db = new Firestore({
  projectId: 'permutive-tech-challenges',
  keyFilename: path1,
  databaseId: '(default)'
});

app.post("/webhook", async (request, response) => {
  const body = request.body as WebhookRequest;

  if (body.type === "taxonomies") {
    const taxonomies = getTaxonomies();
    return response.json(taxonomies);
  }

  if (body.type === "classify") {
    const { url } = body;

    let url1 = url;
    if (url1.endsWith('/')) {
      url1 = url1.slice(0, -1);
    }

    const urlParts = url1.split('-');
    const articleId = urlParts[urlParts.length - 1];

    if (!articleId || isNaN(Number(articleId))) {
      return response.json({ classifications: [] });
    }

    const docRef = db.collection('tdc_article_categories').doc(articleId);
    const docSnap = await docRef.get();

    if (docSnap.exists === false) {
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
        
        const tagObject = {
          type: "categories",
          value: String(currentCategoryNumber),
          taxonomy: dynamicTaxonomyId 
        };
        
        structuredOutput.push(tagObject);
      }
    }

    return response.json({ classifications: structuredOutput });
  }

  return response.status(400).json({
    error: `Unknown request type: ${(request.body as { type?: string }).type ?? "unknown"}`,
  });
});

export default app;
