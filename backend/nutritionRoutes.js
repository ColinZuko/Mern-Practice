const express = require("express");
const database = require("./connect");
const { requireRole } = require("./auth");
const { estimateNutrition } = require("./nutrition");

let nutritionRoutes = express.Router();

// Ingredient lines without group headings ("For the sauce:") and empty lines
function ingredientLines(text) {
  return String(text)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.endsWith(":"))
    .slice(0, 80);
}

//#1 - Estimate nutrition per serving from an ingredient list - editors and admins only
nutritionRoutes.route("/nutrition/estimate").post(requireRole("editor", "admin"), async (request, response) => {
  const { ingredients, servings, overrides } = request.body || {};
  if (typeof ingredients !== "string" || !ingredients.trim()) {
    return response.status(400).json({ message: "Add some ingredients first" });
  }
  const portions = Number(servings);
  if (!Number.isFinite(portions) || portions < 1 || portions > 500) {
    return response.status(400).json({ message: "Fill in how many servings the recipe makes" });
  }
  try {
    const result = await estimateNutrition(
      database.getDb(),
      ingredientLines(ingredients),
      portions,
      overrides && typeof overrides === "object" ? overrides : {},
    );
    response.json(result);
  } catch (error) {
    if (error.status === 429) {
      return response.status(503).json({ message: "The nutrition database is busy right now. Please try again in an hour." });
    }
    console.error("Nutrition estimate failed:", error);
    response.status(502).json({ message: "Couldn't reach the nutrition database. Please try again." });
  }
});

module.exports = nutritionRoutes;
