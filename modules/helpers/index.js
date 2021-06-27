const { LastSplash, FirstSplash } = require('../regexp-library');

module.exports.trimLastSplash = (url) => {
    return url.replace(LastSplash, '');
}

module.exports.trimFirstSplash = (url) => {
    return url.replace(FirstSplash, '');
}