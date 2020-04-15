String.prototype.SplitIntoParts = function(partLength){
	let list = [];
	if (this !== "" && partLength > 0)
	{
		for (let i = 0; i < this.length; i += partLength)
		{
			list.push(this.substr(i, Math.min(partLength, this.length)));
		}
	}
	return list;
}

function getRandomArbitrary(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    SplitIntoParts: this.SplitIntoParts,
    getRandom: getRandomArbitrary
}