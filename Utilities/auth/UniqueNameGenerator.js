
const { uniqueNamesGenerator, adjectives, animals } = require('unique-names-generator');
const en = require("nanoid-good/locale/en"); // you should add locale of your preferred language
const nanoid = require("nanoid-good").nanoid(en);

const generateUniqueGoofyName = () => {
    const goofyName = uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: '-',
        style: 'lowerCase',
    });

    const shortId = nanoid(4);
    return `${goofyName}-${shortId}`;
}

module.exports = { generateUniqueGoofyName };
