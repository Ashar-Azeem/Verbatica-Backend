require('dotenv').config();
const embedder = require('./services/Elastic_Search/createEmbeddings');
const axios = require('axios');




(async () => {
    const post = {
        title: "What should be done with these lgbtq people ??",
        description: "These people are getting out of hand man"
    }
    const output = await embedder([post.title + " " + post.description]);


    const res = await axios.post("http://localhost:8000/embed", {
        texts: [post.title + " " + post.description],
    });
    const output2 = res.data.embeddings[0];

    console.log("The output:");
    console.log(output === output2);

})();