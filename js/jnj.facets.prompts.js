var prompter = {
	// for a concept in a given vocabulary with a certain class, provide a list of preset filters to choose from with a friendly description
	fe: undefined,
	prompts: [],
	get_prompts: function (concept, facet_engine) {
		this.fe = facet_engine;
		this.prompts = [];

		this.resolve_prompt('What concepts are a little more general than this concept?', [{
			c: 'Relationship',
			n: 'Ancestor'
		}, {
			c: 'Distance',
			n: '1'
		}]);

		switch (concept.VOCABULARY_ID) {
		case 'SNOMED':
			{
				switch (concept.CONCEPT_CLASS_ID) {
				case 'Clinical finding':
					this.resolve_prompt('What Preferred Terms are related to this Clinical Finding?', [{
						c: 'Class',
						n: 'Preferred Term'
					}]);
					break;
				}
				break;
			}
		case 'RxNorm':
			switch (concept.CONCEPT_CLASS_ID) {
			case 'Ingredient':
				this.resolve_prompt('What are the Brand Names for this Ingredient?', [{
					c: 'Class',
					n: 'Brand Name'
				}]);
				break;
			}
			break;
		case 'Indication':
		}

		return this.prompts;
	},
	resolve_prompt: function (caption, requirements) {
		var filters = [];

		for (var r = 0; r < requirements.length; r++) {
			for (var f = 0; f < this.fe.Facets.length; f++) {
				if (this.fe.Facets[f].caption == requirements[r].c) {
					for (var m = 0; m < this.fe.Facets[f].Members.length; m++) {
						if (this.fe.Facets[f].Members[m].Name == requirements[r].n) {
							filters.push(f + '-' + m);
						}
					}
				}
			}
		}

		if (filters.length == requirements.length) {
			this.prompts.push({
				caption: caption,
				filters: filters
			});
		}
	}
}
