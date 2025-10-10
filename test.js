// const { initElasticsearch } = require('./services/Elastic_Search/init');
// const { esClient } = require('./services/Elastic_Search/init');

// const insert = require('./services/Elastic_Search/insert');
// const recommendPosts = require('./services/Elastic_Search/recommendPosts');
// const searchPosts = require('./services/Elastic_Search/searchPosts');
// const createEmbeddings = require('./services/Elastic_Search/createEmbeddings')


// const run = async () => {
//     await initElasticsearch();

//     const posts = [
//         // Politics & Military
//         { title: "Military Spending Debate", content: "Should countries increase or reduce military budgets? Defense spending, military power, and global security." },
//         { title: "Mandatory Military Service Controversy", content: "Is compulsory military service fair? Pros, cons, and human rights debates." },
//         { title: "Russia-Ukraine Conflict Updates", content: "Latest news, NATO involvement, sanctions, and global impacts of the Russia-Ukraine war." },
//         { title: "US vs China Military Power", content: "Comparing US and China military strength, nuclear capabilities, and global dominance." },
//         { title: "Private Military Contractors", content: "The ethics of private armies like Wagner and Blackwater. Security or mercenary controversy?" },

//         // LGBTQ+ & Gender
//         { title: "Transgender Rights Debate", content: "Controversial laws on transgender athletes, bathroom access, and healthcare rights." },
//         { title: "Same-Sex Marriage Worldwide", content: "Which countries legalized gay marriage and which still oppose LGBTQ+ rights?" },
//         { title: "Pride Month Backlash", content: "Corporate support of Pride vs accusations of rainbow-washing. LGBTQ+ community responses." },
//         { title: "Gender Pronouns in Schools", content: "Debates over enforcing gender-neutral pronouns in classrooms and workplaces." },
//         { title: "LGBTQ+ in the Military", content: "Should openly LGBTQ+ people serve in the military? Policy changes and global perspectives." },

//         // Technology & Ethics
//         { title: "AI Replacing Human Jobs", content: "Automation, layoffs, and debates over universal basic income. AI vs human work." },
//         { title: "Deepfake Technology Dangers", content: "Fake videos, misinformation, political risks, and AI regulation." },
//         { title: "AI Bias in Policing", content: "Facial recognition, racial bias, and controversial AI use in law enforcement." },
//         { title: "Privacy vs Surveillance", content: "Governments using AI and data tracking for safety vs invasion of privacy." },
//         { title: "AI in Warfare", content: "Should killer drones and autonomous weapons be banned? AI military ethics." },

//         // Climate & Environment
//         { title: "Climate Change Skepticism", content: "Debate between climate activists and deniers. Global warming controversy." },
//         { title: "Nuclear Energy Debate", content: "Is nuclear power clean energy or a dangerous risk? Pros and cons." },
//         { title: "Fossil Fuels vs Renewables", content: "The battle between oil companies and renewable energy advocates." },
//         { title: "Meat Industry vs Veganism", content: "Climate activists argue against meat consumption, while farmers defend tradition." },
//         { title: "Climate Protests and Civil Disobedience", content: "Are disruptive climate protests justified or harmful to society?" },

//         // Society & Culture
//         { title: "Cancel Culture Debate", content: "Should celebrities lose their career over past mistakes? Freedom of speech vs accountability." },
//         { title: "Gun Control in America", content: "Second Amendment supporters clash with gun reform advocates." },
//         { title: "Immigration and Border Walls", content: "Debates on immigration policies, refugees, and national security." },
//         { title: "Freedom of Speech Limits", content: "Should hate speech be banned online? Free speech vs protection." },
//         { title: "Religious Symbols in Public Spaces", content: "Controversy over wearing hijabs, crosses, or religious symbols in schools and workplaces." },

//         // Health & Lifestyle
//         { title: "COVID-19 Vaccine Mandates", content: "Public health vs personal freedom: should vaccines be mandatory?" },
//         { title: "Abortion Rights Debate", content: "Pro-choice vs pro-life: legal, ethical, and religious perspectives." },
//         { title: "Drug Legalization Controversy", content: "Should marijuana and other drugs be legalized or banned?" },
//         { title: "Euthanasia and Assisted Suicide", content: "Should terminally ill patients have the right to die?" },
//         { title: "Body Positivity vs Health Concerns", content: "Celebrating all body types vs promoting unhealthy lifestyles." }
//     ];



//     //Test insert function:
//     // for (let i = 0; i < posts.length; i++) {
//     //     await insert({
//     //         id: i + 1,
//     //         title: posts[i].title,
//     //         description: posts[i].content,
//     //         upload_at: new Date()
//     //     });
//     // }
//     // Test history posts:
//     // const historyPosts = [
//     //     { id: 30, watched_at: "2025-08-24T10:15:00Z" },
//     //     { id: 31, watched_at: "2025-08-20T14:30:00Z" },

//     // ];
//     // historyPosts.map((item) => {
//     //     console.log(posts[item.id - 1]);
//     // });
//     // // Recommended posts based on history:
//     // const recommendedPosts = await recommendPosts(historyPosts, 10, 1, null, null);
//     // console.log(recommendedPosts);

//     // //recommend searched posts:
//     const search = "Free Speech or Harmful Speech: Where’s the Line? Should online platforms crack down on hate speech to ensure user safety, or does this risk stifling free expression? A look at the debate."
//     const queryEmbedding = await createEmbeddings([search]);
//     const recommendedPost = await searchPosts(queryEmbedding);
//     console.log(recommendedPost);

//     // const ads = [
//     //     { id: "ad1", title: "Glow Up Skincare ✨", description: "Say hello to glowing skin 🌸! Our vitamin C serum hydrates & brightens. Shop now with 20% off!" },
//     //     { id: "ad2", title: "Weekend Coffee Vibes ☕", description: "Freshly brewed happiness is here! Order your favorite roast & get free delivery today. #CoffeeLovers" },
//     //     { id: "ad3", title: "Streetwear Drop 🔥", description: "Limited edition hoodies & sneakers just landed. Don’t miss the streetwear trend everyone’s talking about!" },
//     //     { id: "ad4", title: "Travel Escape ✈️", description: "Plan your dream trip with exclusive holiday packages. Maldives, Bali, or Paris? We got you covered ❤️" },
//     //     { id: "ad5", title: "Home Workout Gear 💪", description: "Turn your living room into a gym! Resistance bands, dumbbells, and mats – 30% OFF this week only." },
//     //     { id: "ad6", title: "Tasty Bites 🍔", description: "Late-night cravings? Order juicy burgers & cheesy fries now with free delivery till midnight." },
//     //     { id: "ad7", title: "Luxury Watches ⌚", description: "Make a statement with our premium watches. Classic, elegant, timeless. Shop your style today." },
//     //     { id: "ad8", title: "Fresh Blooms 🌹", description: "Send love with flowers. Same-day delivery for roses, lilies & more. Perfect for any occasion 💐" },
//     //     { id: "ad9", title: "Fitness Fuel 🥤", description: "Protein shakes & healthy snacks made delicious! Grab yours today & power up your workouts." },
//     //     { id: "ad10", title: "Tech Upgrade 📱", description: "Latest smartphones with unbeatable deals. Trade in your old phone & save big today!" },
//     // ];

//     // // Test insert function:
//     // for (let i = 0; i < ads.length; i++) {
//     //     await insert.indexAd({
//     //         id: ads[i].id,
//     //         title: ads[i].title,
//     //         description: ads[i].description,
//     //     });
//     // }

//     // Test history posts:
//     // const historyPosts = [
//     //     { id: 32, watched_at: "2025-08-24T10:15:00Z" },
//     //     { id: 36, watched_at: "2025-08-20T14:30:00Z" },

//     // ];

//     // // Recommended posts based on history:
//     // const recommendedAd = await recommendPosts.recommendAd([], 1, [{ id: "ad1" }, { id: "ad2" }, { id: "ad3" }, { id: "ad4" }, { id: "ad5" }], null);
//     // console.log(recommendedAd);
// }

// run();
require('dotenv').config();

const connectAll = require('./Utilities/cloud/ConnectionToCloudResources');
const insertIntoElasticSearch = require('./Utilities/cloud/mediaToCloud');

const startServer = async () => {
    await connectAll();
    await insertIntoElasticSearch.deleteMediaByUrl('https://res.cloudinary.com/ds0xs31vd/image/upload/v1759588304/verbatica%27s_images/aybbubi7gqbfofkupkdh.jpg')
};
startServer()




