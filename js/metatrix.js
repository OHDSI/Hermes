var metatrix = {
	'RxNorm.Ingredient': {
		childRelationships: ['Ingredient of (RxNorm)'],
		parentRelationships: ['Has inferred drug class (OMOP)'],
		synonymRelationships: ['Has tradename (RxNorm)']
	},
	'RxNorm.Brand Name': {
		childRelationships: ['Ingredient of (RxNorm)'],
		parentRelationships: ['Tradename of (RxNorm)'],
		synonymRelationships: ['Has precise ingredient (RxNorm) ']
	},
	'RxNorm.Branded Drug': {
		childRelationships: ['Consists of (RxNorm)'],
		parentRelationships: ['Has ingredient (RxNorm)', 'RxNorm to ATC (RxNorm)', 'RxNorm to ETC (FDB)'],
		synonymRelationships: ['RxNorm to SPL (NLM)']
	},
	'RxNorm.Clinical Drug Comp': {
		childRelationships: [],
		parentRelationships: ['Has precise ingredient (RxNorm)', 'Has ingredient (RxNorm)'],
		synonymRelationships: ['Constitutes (RxNorm)', 'Non-standard to Standard map (OMOP)', 'Has tradename (RxNorm)']
	},
	'CPT4.CPT4': {
		childRelationships: [],
		parentRelationships: ['Is a'],
		synonymRelationships: []
	},
	'CPT4.CPT4 Hierarchy': {
		childRelationships: ['Subsumes'],
		parentRelationships: ['Is a'],
		synonymRelationships: ['Standard to Non-standard map (OMOP)']
	},
	'ETC.ETC': {
		childRelationships: ['Subsumes', 'Inferred drug class of (OMOP)'],
		parentRelationships: ['Is a', 'Has ancestor of'],
		synonymRelationships: ['Has precise ingredient (RxNorm) ']
	},
	'MedDRA.PT': {
		childRelationships: ['Subsumes'],
		parentRelationships: ['Has ancestor of'],
		synonymRelationships: ['MedDRA to ICD-9-CM (MSSO)']
	},
	'MedDRA.HLT': {
		childRelationships: ['Subsumes'],
		parentRelationships: ['Has ancestor of'],
		synonymRelationships: []
	},
	'MedDRA.SOC': {
		childRelationships: ['Subsumes'],
		parentRelationships: [],
		synonymRelationships: []
	},
	'MedDRA.HLGT': {
		childRelationships: ['Subsumes'],
		parentRelationships: ['Is a'],
		synonymRelationships: ['MedDRA to SNOMED equivalent (OMOP)']
	},
	'SNOMED.Clinical Finding': {
		childRelationships: ['Subsumes'],
		parentRelationships: ['Is a', 'Has ancestor of'],
		synonymRelationships: ['MedDRA to SNOMED equivalent (OMOP)']
	}
};
