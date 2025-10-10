const cron = require("node-cron");
const fetch = require("node-fetch");
const newsModel = require('../models/news');

const API_KEY = process.env.GNEWSAPI;
const interestingCountries = ["us", "gb", "in", "pk", "ru", "cn"];
const interestingCountryNames = [
    "United States",
    "United Kingdom",
    "India",
    "Pakistan",
    "Russia",
    "China",
];

// Fetch top 10 news for a single country
async function fetchNewsForCountry(country) {
    const url = `https://gnews.io/api/v4/top-headlines?token=${API_KEY}&country=${country}&max=10&lang=en`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            throw new Error(`Error fetching news for ${country}: ${res.statusText}`);
        }

        const data = await res.json();

        const articles = data.articles.map(article => ({
            id: article.id,
            title: article.title,
            description: article.description,
            url: article.url,
            image: article.image,
            sourceName: article.source?.name || "Unknown",
            sourceUrl: article.source?.url || "",
        }));

        return { country, articles };
    } catch (err) {
        console.error(err);
        return { country, articles: [] };
    }
}

// Fetch for all countries
async function fetchAllNews() {
    for (const country of interestingCountries) {
        const newsList = await fetchNewsForCountry(country);
        const tasks = newsList.articles.map((news) => newsModel.insertOrUpdateNews(news, interestingCountryNames[interestingCountries.indexOf(country)]));
        await Promise.allSettled(tasks);
        await new Promise(res => setTimeout(res, 1000));
    }
}

// Run every midnight
const newsCronJob = cron.schedule("* * * * *", async () => {
    console.log("Fetching daily news...");
    await fetchAllNews();
});

module.exports = newsCronJob;