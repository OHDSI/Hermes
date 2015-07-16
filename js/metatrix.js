var metatrix = {
	'RxNorm.Ingredient': {
		childRelationships: [{
			name: 'Ingredient of (RxNorm)',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Has inferred drug class (OMOP)',
			range: [0, 999]
		}]
	},
	'RxNorm.Brand Name': {
		childRelationships: [{
			name: 'Ingredient of (RxNorm)',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Tradename of (RxNorm)',
			range: [0, 999]
		}]
	},
	'RxNorm.Branded Drug': {
		childRelationships: [{
			name: 'Consists of (RxNorm)',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Has ingredient (RxNorm)',
			range: [0, 999]
		}, {
			name: 'RxNorm to ATC (RxNorm)',
			range: [0, 999]
		}, {
			name: 'RxNorm to ETC (FDB)',
			range: [0, 999]
		}]
	},
	'RxNorm.Clinical Drug Comp': {
		childRelationships: [],
		parentRelationships: [{
			name: 'Has precise ingredient (RxNorm)',
			range: [0, 999]
		}, {
			name: 'Has ingredient (RxNorm)',
			range: [0, 999]
		}]
	},
	'CPT4.CPT4': {
		childRelationships: [],
		parentRelationships: [{
			name: 'Is a',
			range: [0, 999]
		}],
		synonymRelationships: []
	},
	'CPT4.CPT4 Hierarchy': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Is a',
			range: [0, 999]
		}]
	},
	'ETC.ETC': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}, {
			name: 'Inferred drug class of (OMOP)',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Is a',
			range: [0, 999]
		}, {
			name: 'Has ancestor of',
			range: [0, 999]
		}]
	},
	'MedDRA.LLT': {
		childRelationships: [],
		parentRelationships: [{
			name: 'Has ancestor of',
			range: [0, 1]
		}, {
			name: 'Is a',
			range: [0, 1]
		}]
	},
	'MedDRA.PT': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Has ancestor of',
			range: [0, 999]
		}]
	},
	'MedDRA.HLT': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Has ancestor of',
			range: [0, 999]
		}]
	},
	'MedDRA.SOC': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: []
	},
	'MedDRA.HLGT': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Is a',
			range: [0, 999]
		}]
	},
	'SNOMED.Clinical Finding': {
		childRelationships: [{
			name: 'Subsumes',
			range: [0, 999]
		}],
		parentRelationships: [{
			name: 'Is a',
			range: [0, 999]
		}, {
			name: 'Has ancestor of',
			range: [0, 1]
		}]
	}
};
