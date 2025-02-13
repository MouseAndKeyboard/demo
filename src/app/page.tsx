"use client";

import { useState, useEffect, useMemo } from "react";
import { PCA } from "ml-pca";
import { kmeans } from "ml-kmeans";
import { squaredEuclidean } from "ml-distance-euclidean";

import Sidebar from "../components/Sidebar";
import ScatterPlot from "../components/ScatterPlot";
import ArticleTable from "../components/ArticleTable";
import DetailModal from "../components/DetailModal";
import { ArticleData } from "../components/types";
import { isNullOrUndefined } from "util";

export default function Home() {
  // ==========================
  // 1) Persistent state
  // ==========================
  const [cagrWeight, setCagrWeight] = useState(0.0);
  const [yearsPenetrationWeight, setYearsPenetrationWeight] = useState(0.0);
  const [adoptionRiskWeight, setAdoptionRiskWeight] = useState(0.0);
  const [techRiskWeight, setTechRiskWeight] = useState(0.0);
  const [disruptionWeight, setDisruptionWeight] = useState(0.0);
  const [roiWeight, setRoiWeight] = useState(0.0);
  const [TRLWeight, setTRLWeight] = useState(0.0);
  const [timeToTRL7YearsWeight, setTimeToTRL7YearsWeight] = useState(0.0);
  const [usdSavingsPerYearWeight, setUsdSavingsPerYearWeight] = useState(0.0);
  const [noveltyWeight, setNoveltyWeight] = useState(0.0);
  const [numPatentsWeight, setNumPatentsWeight] = useState(0.0);
  const [comSuccessProbWeight, setComSuccessProbWeight] = useState(0.0);
  const [breakEvenTimeWeight, setBreakEvenTimeWeight] = useState(0.0);
  const [competitorsCountWeight, setCompetitorsCountWeight] = useState(0.0);
  const [marketShareWeight, setMarketShareWeight] = useState(0.0);
  const [standaloneCommWeight, setStandaloneCommWeight] = useState(0.0);
  const [improvementWeight, setImprovementWeight] = useState(0.0);
  const [enablesMarketWeight, setEnablesMarketWeight] = useState(0.0);
  const [globalMarketLogWeight, setGlobalMarketLogWeight] = useState(0.0);
  const [annualRevenueLogWeight, setAnnualRevenueLogWeight] = useState(0.0);
  const [rndInvestmentLogWeight, setRndInvestmentLogWeight] = useState(0.0);

  const [scoreThreshold, setScoreThreshold] = useState(0.7);
  const [pinned, setPinned] = useState<string[]>([]);

  // NEW: an array of excluded categories
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);

  // ==========================
  // 2) Load from localStorage on first mount
  // ==========================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("myAppState");
      if (saved) {
        const parsed = JSON.parse(saved);

        // Restore each saved field, if it exists
        setCagrWeight(parsed.cagrWeight ?? 0.0);
        setYearsPenetrationWeight(parsed.yearsPenetrationWeight ?? 0.0);
        setAdoptionRiskWeight(parsed.adoptionRiskWeight ?? 0.0);
        setTechRiskWeight(parsed.techRiskWeight ?? 0.0);
        setDisruptionWeight(parsed.disruptionWeight ?? 0.0);
        setRoiWeight(parsed.roiWeight ?? 0.0);
        setTRLWeight(parsed.TRLWeight ?? 0.0);
        setTimeToTRL7YearsWeight(parsed.timeToTRL7YearsWeight ?? 0.0);
        setUsdSavingsPerYearWeight(parsed.usdSavingsPerYearWeight ?? 0.0);
        setNoveltyWeight(parsed.noveltyWeight ?? 0.0);
        setNumPatentsWeight(parsed.numPatentsWeight ?? 0.0);
        setComSuccessProbWeight(parsed.comSuccessProbWeight ?? 0.0);
        setBreakEvenTimeWeight(parsed.breakEvenTimeWeight ?? 0.0);
        setCompetitorsCountWeight(parsed.competitorsCountWeight ?? 0.0);
        setMarketShareWeight(parsed.marketShareWeight ?? 0.0);
        setStandaloneCommWeight(parsed.standaloneCommWeight ?? 0.0);
        setImprovementWeight(parsed.improvementWeight ?? 0.0);
        setEnablesMarketWeight(parsed.enablesMarketWeight ?? 0.0);
        setGlobalMarketLogWeight(parsed.globalMarketLogWeight ?? 0.0);
        setAnnualRevenueLogWeight(parsed.annualRevenueLogWeight ?? 0.0);
        setRndInvestmentLogWeight(parsed.rndInvestmentLogWeight ?? 0.0);

        setScoreThreshold(parsed.scoreThreshold ?? 0.7);
        setPinned(parsed.pinned ?? []);

        // Also restore excludedCategories
        setExcludedCategories(parsed.excludedCategories ?? []);
      }
    }
  }, []);

  // ==========================
  // 3) Whenever these states change, save them to localStorage
  // ==========================
  useEffect(() => {
    if (typeof window !== "undefined") {
      const toSave = {
        cagrWeight,
        yearsPenetrationWeight,
        adoptionRiskWeight,
        techRiskWeight,
        disruptionWeight,
        roiWeight,
        TRLWeight,
        timeToTRL7YearsWeight,
        usdSavingsPerYearWeight,
        noveltyWeight,
        numPatentsWeight,
        comSuccessProbWeight,
        breakEvenTimeWeight,
        competitorsCountWeight,
        marketShareWeight,
        standaloneCommWeight,
        improvementWeight,
        enablesMarketWeight,
        globalMarketLogWeight,
        annualRevenueLogWeight,
        rndInvestmentLogWeight,
        scoreThreshold,
        pinned,
        excludedCategories, // new
      };
      localStorage.setItem("myAppState", JSON.stringify(toSave));
    }
  }, [
    cagrWeight,
    yearsPenetrationWeight,
    adoptionRiskWeight,
    techRiskWeight,
    disruptionWeight,
    roiWeight,
    TRLWeight,
    timeToTRL7YearsWeight,
    usdSavingsPerYearWeight,
    noveltyWeight,
    numPatentsWeight,
    comSuccessProbWeight,
    breakEvenTimeWeight,
    competitorsCountWeight,
    marketShareWeight,
    standaloneCommWeight,
    improvementWeight,
    enablesMarketWeight,
    globalMarketLogWeight,
    annualRevenueLogWeight,
    rndInvestmentLogWeight,
    scoreThreshold,
    pinned,
    excludedCategories,
  ]);

  // ==========================
  // 4) Other states that don't need persistence
  // ==========================
  const [rawData, setRawData] = useState<ArticleData[]>([]);
  const [processedData, setProcessedData] = useState<ArticleData[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<ArticleData | null>(null);
  const [colorBy, setColorBy] = useState<"cluster" | "composite_score">("cluster");

  // ==========================
  // 5) Load data from /public/data.json
  // ==========================
  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((data: ArticleData[]) => {
        setRawData(data);
      })
      .catch((err) => console.error(err));
  }, []);

  // ==========================
  // 6) Compute the composite score for each article
  // ==========================
  function computeComposite(d: ArticleData): number {
    const score =
      (d.CAGR * cagrWeight) -
      (d.years_to_50pct_penetration * yearsPenetrationWeight) -
      (d.adoption_risk_1_to_10 * adoptionRiskWeight) -
      (d.technological_risk_1_to_10 * techRiskWeight) +
      (d.disruption_score_1_to_10 * disruptionWeight) +
      (d.ROI_percent * roiWeight) +
      ((d.TRL || 0) * TRLWeight) -
      ((d.time_to_TRL_7_years || 0) * timeToTRL7YearsWeight) +
      ((d.usd_savings_per_year || 0) * usdSavingsPerYearWeight) +
      ((d.novelty_1_to_10 || 0) * noveltyWeight) +
      ((d.number_distinct_patents || 0) * numPatentsWeight) +
      ((d.commercialisation_success_probability_percent || 0) * comSuccessProbWeight) -
      ((d.break_even_time_years || 0) * breakEvenTimeWeight) -
      ((d.competitors_count || 0) * competitorsCountWeight) +
      ((d.five_year_market_share_percent || 0) * marketShareWeight) +
      ((d.standalone_commericality_1_to_10 || 0) * standaloneCommWeight) +
      ((d.improvement_compared_to_existing_1_to_10 || 0) * improvementWeight) +
      ((d.enables_or_reshapes_market_1_to_10 || 0) * enablesMarketWeight) +
      ((d.global_market_size_USD_log || 0) * globalMarketLogWeight) +
      ((d.annual_revenue_USD_log || 0) * annualRevenueLogWeight) -
      ((d.rnd_investment_required_log || 0) * rndInvestmentLogWeight);

    return score;
  }

  // ==========================
  // 7) PCA + K-means on load or slider changes
  // ==========================
  useEffect(() => {
    if (rawData.length === 0) return;

    // Numeric columns
    const numericCols = [
      "CAGR",
      "years_to_50pct_penetration",
      "TRL",
      "time_to_TRL_7_years",
      "usd_savings_per_year",
      "ROI_percent",
      "novelty_1_to_10",
      "number_distinct_patents",
      "commercialisation_success_probability_percent",
      "break_even_time_years",
      "adoption_risk_1_to_10",
      "technological_risk_1_to_10",
      "competitors_count",
      "five_year_market_share_percent",
      "disruption_score_1_to_10",
      "standalone_commericality_1_to_10",
      "improvement_compared_to_existing_1_to_10",
      "enables_or_reshapes_market_1_to_10",
      "global_market_size_USD_log",
      "annual_revenue_USD_log",
      "rnd_investment_required_log",
    ];

    // Build matrix
    const matrix = rawData.map((article) =>
      numericCols.map((col) => {
        const val = article[col as keyof ArticleData];
        return typeof val === "number" ? val : 0;
      })
    );

    // PCA
    const pcaModel = new PCA(matrix, { method: "SVD", center: true, scale: false });
    const coords = pcaModel.predict(matrix, { nComponents: 2 });

    // K-means
    const k = 5;
    const km = kmeans(matrix, k, {
      maxIterations: 100,
      tolerance: 1e-6,
      initialization: "kmeans++",
      distanceFunction: squaredEuclidean,
    });

    // Build processed data
    const updated = rawData.map((d, i) => {
      const pcaX = coords.get(i, 0);
      const pcaY = coords.get(i, 1);
      const cluster = km.clusters[i];
      const composite = computeComposite(d);

      return {
        ...d,
        pcaX,
        pcaY,
        cluster,
        compositeScore: composite,
      };
    });

    // Normalize compositeScore 0..1
    const minC = Math.min(...updated.map((u) => u.compositeScore ?? 0));
    const maxC = Math.max(...updated.map((u) => u.compositeScore ?? 1));
    const finalData = updated.map((u) => {
      const cScore = u.compositeScore ?? 0;
      const norm = (cScore - minC) / (maxC - minC + 1e-9);
      return { ...u, compositeScore: norm };
    });

    setProcessedData(finalData);
    setSelectedCluster(null);
    setSelectedArticle(null);
  }, [
    rawData,
    cagrWeight,
    yearsPenetrationWeight,
    adoptionRiskWeight,
    techRiskWeight,
    disruptionWeight,
    roiWeight,
    TRLWeight,
    timeToTRL7YearsWeight,
    usdSavingsPerYearWeight,
    noveltyWeight,
    numPatentsWeight,
    comSuccessProbWeight,
    breakEvenTimeWeight,
    competitorsCountWeight,
    marketShareWeight,
    standaloneCommWeight,
    improvementWeight,
    enablesMarketWeight,
    globalMarketLogWeight,
    annualRevenueLogWeight,
    rndInvestmentLogWeight,
  ]);

  // ==========================
  // 8) Filter pipeline: first threshold + cluster -> subsetBeforeExclude
  // ==========================
  const subsetBeforeExclude = useMemo(() => {
    let subset = processedData;
    // Step 1: threshold
    subset = subset.filter((d) => (d.compositeScore ?? 0) >= scoreThreshold);

    // Step 2: cluster selection
    if (selectedCluster !== null) {
      subset = subset.filter((d) => d.cluster === selectedCluster);
    }
    return subset;
  }, [processedData, scoreThreshold, selectedCluster]);

  // ==========================
  // 9) Figure out the top 5 categories in that subset
  // ==========================
  const topCategories = useMemo(() => {
    // Count frequency of each category
    const freqMap: Record<string, number> = {};
    subsetBeforeExclude.forEach((art) => {
      if (art.categories == "nan") return;

      art.categories.forEach((cat) => {
        freqMap[cat] = (freqMap[cat] || 0) + 1;
      });
    });

    // Convert to array & sort descending
    const sorted = Object.entries(freqMap).sort((a, b) => b[1] - a[1]);

    // Take the top 10
    return sorted.slice(0, 10); // array of [category, count]
  }, [subsetBeforeExclude]);

  // ==========================
  // 10) Exclude categories -> finalFiltered
  // ==========================
  const finalFiltered = useMemo(() => {
    // From subsetBeforeExclude, exclude any article that has an excluded category
    if (excludedCategories.length === 0) return subsetBeforeExclude;

    return subsetBeforeExclude.filter((art) => {
      // If art.categories intersects with excludedCategories, exclude it
      if (art.categories == "nan") return true;
      return !art.categories.some((cat) => excludedCategories.includes(cat));
    });
  }, [subsetBeforeExclude, excludedCategories]);

  // We'll use finalFiltered for the scatter plot and table
  const scatterData = finalFiltered;
  const tableData = finalFiltered;

  // ==========================
  // 11) Handlers
  // ==========================
  function handlePointClick(a: ArticleData) {
    setSelectedArticle(a);
  }
  function handleRowClick(a: ArticleData) {
    setSelectedArticle(a);
  }
  function closeModal() {
    setSelectedArticle(null);
  }
  function togglePin(a: ArticleData) {
    const t = a.title;
    if (pinned.includes(t)) {
      setPinned(pinned.filter((x) => x !== t));
    } else {
      setPinned([...pinned, t]);
    }
  }

  // Helper to exclude a category
  function excludeCategory(cat: string) {
    setExcludedCategories((prev) =>
      prev.includes(cat) ? prev : [...prev, cat]
    );
  }

  // Helper to remove from excluded
  function undoExcludeCategory(cat: string) {
    setExcludedCategories((prev) => prev.filter((c) => c !== cat));
  }

  // ==========================
  // 12) Render
  // ==========================
  return (
    <div className="flex h-screen">
      {/* SIDEBAR */}
      <Sidebar
        cagrWeight={cagrWeight}
        setCagrWeight={setCagrWeight}
        yearsPenetrationWeight={yearsPenetrationWeight}
        setYearsPenetrationWeight={setYearsPenetrationWeight}
        adoptionRiskWeight={adoptionRiskWeight}
        setAdoptionRiskWeight={setAdoptionRiskWeight}
        techRiskWeight={techRiskWeight}
        setTechRiskWeight={setTechRiskWeight}
        disruptionWeight={disruptionWeight}
        setDisruptionWeight={setDisruptionWeight}
        roiWeight={roiWeight}
        setRoiWeight={setRoiWeight}
        pinnedCount={pinned.length}
        TRLWeight={TRLWeight}
        setTRLWeight={setTRLWeight}
        timeToTRL7YearsWeight={timeToTRL7YearsWeight}
        setTimeToTRL7YearsWeight={setTimeToTRL7YearsWeight}
        usdSavingsPerYearWeight={usdSavingsPerYearWeight}
        setUsdSavingsPerYearWeight={setUsdSavingsPerYearWeight}
        noveltyWeight={noveltyWeight}
        setNoveltyWeight={setNoveltyWeight}
        numPatentsWeight={numPatentsWeight}
        setNumPatentsWeight={setNumPatentsWeight}
        comSuccessProbWeight={comSuccessProbWeight}
        setComSuccessProbWeight={setComSuccessProbWeight}
        breakEvenTimeWeight={breakEvenTimeWeight}
        setBreakEvenTimeWeight={setBreakEvenTimeWeight}
        competitorsCountWeight={competitorsCountWeight}
        setCompetitorsCountWeight={setCompetitorsCountWeight}
        marketShareWeight={marketShareWeight}
        setMarketShareWeight={setMarketShareWeight}
        standaloneCommWeight={standaloneCommWeight}
        setStandaloneCommWeight={setStandaloneCommWeight}
        improvementWeight={improvementWeight}
        setImprovementWeight={setImprovementWeight}
        enablesMarketWeight={enablesMarketWeight}
        setEnablesMarketWeight={setEnablesMarketWeight}
        globalMarketLogWeight={globalMarketLogWeight}
        setGlobalMarketLogWeight={setGlobalMarketLogWeight}
        annualRevenueLogWeight={annualRevenueLogWeight}
        setAnnualRevenueLogWeight={setAnnualRevenueLogWeight}
        rndInvestmentLogWeight={rndInvestmentLogWeight}
        setRndInvestmentLogWeight={setRndInvestmentLogWeight}
        scoreThreshold={scoreThreshold}
        setScoreThreshold={setScoreThreshold}
      />

      {/* MAIN COLUMN */}
      <div className="flex-1 flex flex-col p-4 overflow-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Commercial Potential Explorer</h1>
          <p className="text-sm text-gray-700">
            Explore thousands of research articles. Adjust weighting in the
            sidebar to see how their composite viability changes. PCA &amp;
            clustering reveal patterns. Pin interesting articles as you go.
          </p>
        </div>

        {/* Color / Cluster Controls */}
        <div className="flex items-center space-x-4">
          <label className="block text-sm font-medium">Color By:</label>
          <select
            className="border rounded px-2 py-1"
            value={colorBy}
            onChange={(e) =>
              setColorBy(e.target.value as "cluster" | "composite_score")
            }
          >
            <option value="cluster">Cluster</option>
            <option value="composite_score">Composite Score</option>
          </select>

          <label className="ml-8 text-sm font-medium">
            Select a Cluster:
            <select
              className="ml-2 border rounded px-2 py-1"
              value={selectedCluster ?? ""}
              onChange={(e) =>
                setSelectedCluster(
                  e.target.value === "" ? null : parseInt(e.target.value)
                )
              }
            >
              <option value="">All</option>
              {[0, 1, 2, 3, 4].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>





        {/* SCATTER */}
        <div className="my-4">
          {scatterData.length > 0 ? (
            <ScatterPlot
              data={scatterData}
              colorBy={colorBy}
              onPointClick={handlePointClick}
            />
          ) : (
            <p>No articles above threshold (after exclusion).</p>
          )}
        </div>

        {/* Show top 5 categories from the subsetBeforeExclude */}
        <div className="bg-white p-4 my-4 shadow">
          <h2 className="text-lg font-bold mb-2">Top 10 Categories (before exclusion)</h2>
          {topCategories.length === 0 ? (
            <p className="text-sm text-gray-600">No categories found.</p>
          ) : (
            <ul className="list-disc list-inside">
              {topCategories.map(([cat, count]) => (
                <li key={cat}>
                  {cat} ({count}){" "}
                  <button
                    onClick={() => excludeCategory(cat)}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    Exclude
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Show currently excluded categories (with a way to re-include) */}
        {excludedCategories.length > 0 && (
          <div className="bg-white p-4 my-4 shadow">
            <h2 className="text-lg font-bold mb-2">Excluded Categories</h2>
            <ul className="list-disc list-inside">
              {excludedCategories.map((cat) => (
                <li key={cat}>
                  {cat}
                  <button
                    onClick={() => undoExcludeCategory(cat)}
                    className="text-blue-600 hover:underline ml-2"
                  >
                    Undo
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}


<div>
        {/* TABLE */}
        <ArticleTable articles={tableData} onRowClick={handleRowClick} />

      </div>
      
        {/* PINNED LIST */}
        <div className="mt-4 bg-white p-4 shadow">
          <h2 className="text-lg font-bold mb-2">Pinned Articles</h2>
          {pinned.length === 0 ? (
            <p className="text-gray-600 text-sm">No pinned items yet.</p>
          ) : (
            <ul className="list-disc list-inside">
              {pinned.map((title, i) => (
                <li key={i}>{title}</li>
              ))}
            </ul>
          )}
        </div>
      </div>




      {/* DETAIL MODAL */}
      <DetailModal
        article={selectedArticle}
        onClose={() => closeModal()}
        pinned={selectedArticle ? pinned.includes(selectedArticle.title) : false}
        onPin={togglePin}
      />
    </div>
  );
}
