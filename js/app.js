var router;
var pageModel;
var initPromises = [];
var datatables = {};

$(document).ready(function () {
	$.support.cors = true;
	$('#querytext').focus();

	pageModel = new ViewModel();

	pageModel.currentConceptMode.subscribe(function (newMode) {
		switch (newMode) {
		case 'evidence':
			// load evidence
			pageModel.loadingEvidence(true);
			var evidencePromise = $.ajax({
				url: pageModel.evidenceUrl() + pageModel.currentConcept().CONCEPT_ID,
				method: 'GET',
				contentType: 'application/json',
				success: function (evidence) {
					pageModel.evidence(evidence);
					pageModel.loadingEvidence(false);

					var evidenceData = [];
					var evidenceSource = {
						name: 'source',
						values: []
					};
					evidenceData.push(evidenceSource);
					var evidenceCount = 0;
					for (var i = 0; i < evidence.length; i++) {
						if (evidence[i].evidenceType == 'MEDLINE_MeSH_CR') {
							var e = {
								evidenceType: evidence[i].evidenceType,
								label: evidence[i].drugName,
								xValue: evidenceCount++,
								yValue: evidence[i].value
							};
							evidenceSource.values.push(e);
						}
					}

					var scatter = new jnj_chart.scatterplot();
					scatter.render(evidenceData, "#conceptEvidenceScatter", 460, 150, {
						yFormat: d3.format('0'),
						xValue: "xValue",
						yValue: "yValue",
						xLabel: "Drugs",
						yLabel: "Raw Value",
						seriesName: "evidenceType",
						showLegend: false,
						tooltips: [{
							label: 'Drug',
							accessor: function (o) {
								return o.label;
							}
						}, {
							label: 'Raw Value',
							accessor: function (o) {
								return o.yValue;
							}
						}],
						colors: d3.scale.category10(),
						showXAxis: false
					});
				},
				error: function () {
					pageModel.loadingEvidence(false);
				}
			});
			break;
		}
	});

	pageModel.currentView.subscribe(function (newView) {
		switch (newView) {
		case 'conceptset':
			pageModel.resolveConceptSetExpression();

			var identifiers = [];
			for (var c = 0; c < pageModel.selectedConcepts().length; c++) {
				identifiers.push(pageModel.selectedConcepts()[c].concept.CONCEPT_ID);
			}
			pageModel.currentConceptIdentifierList(identifiers.join(','));

			break;
		case 'reports':
			$.ajax({
				url: pageModel.services()[0].url + 'cohortdefinition',
				method: 'GET',
				contentType: 'application/json',
				success: function (cohortDefinitions) {
					pageModel.cohortDefinitions(cohortDefinitions);
				}
			});
			break;
		case 'cohortdefinitions':
			$.ajax({
				url: pageModel.services()[0].url + 'cohortdefinition',
				method: 'GET',
				contentType: 'application/json',
				success: function (cohortDefinitions) {
					pageModel.cohortDefinitions(cohortDefinitions);
				}
			});
			break;
		}
	});

	pageModel.currentConceptSetMode.subscribe(function (newMode) {
		switch (newMode) {
		case 'included':
			$.ajax({
				url: pageModel.vocabularyUrl() + 'lookup',
				method: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(pageModel.conceptSetInclusionIdentifiers()),
				success: function (data) {
					pageModel.includedConcepts(data);
				}
			});
			break;
		case 'analysis':
			$.ajax({
				url: pageModel.resultsUrl() + 'conceptRecordCount',
				method: 'POST',
				contentType: 'application/json',
				data: JSON.stringify(pageModel.conceptSetInclusionIdentifiers()),
				success: function (root) {
					var ph = new packingHierarchy();
					ph.render('#wrapperAnalysisVisualization', root);
				}
			});
			break;
		}
	});

	// default view
	pageModel.currentView('initializing');

	// handle selections with shopping cart icon
	$(document).on('click', '.wrapperTitle .fa-shopping-cart, .conceptTable i.fa.fa-shopping-cart', function () {

		$(this).toggleClass('selected');
		var concept = ko.contextFor(this).$data;

		if ($(this).hasClass('selected')) {
			var conceptSetItem = pageModel.createConceptSetItem(concept);
			pageModel.selectedConcepts.push(conceptSetItem);
			pageModel.selectedConceptsIndex[concept.CONCEPT_ID] = 1;
		} else {
			delete pageModel.selectedConceptsIndex[concept.CONCEPT_ID];
			pageModel.selectedConcepts.remove(function (i) {
				return i.concept.CONCEPT_ID == concept.CONCEPT_ID;
			});
		}

		pageModel.analyzeSelectedConcepts();
	});

	// concept set selector handling
	$(document).on('click', '.conceptSetTable i.fa.fa-shopping-cart', function () {
		$(this).toggleClass('selected');
		var conceptSetItem = ko.contextFor(this).$data;

		delete pageModel.selectedConceptsIndex[conceptSetItem.concept.CONCEPT_ID];
		pageModel.selectedConcepts.remove(function (i) {
			return i.concept.CONCEPT_ID == conceptSetItem.concept.CONCEPT_ID;
		});

		pageModel.resolveConceptSetExpression();
		pageModel.analyzeSelectedConcepts();
	});

	var routes = {
		'/concept/:conceptId:': loadConcept,
		'/cohortdefinitions': function () {
			pageModel.currentView('cohortdefinitions');
		},
		'/configure': function () {
			pageModel.currentView('configure');
		},
		'/jobs': function () {
			pageModel.currentView('loading');
			pageModel.loadJobs();
		},
		'reports': function () {
			pageModel.currentView('reports');
		},
		'/cohortdefinition/:cohortDefinitionId:': loadCohortDefinition,
		'/search/:query:': search,
		'/search': function () {
			pageModel.currentView('search');
		}
	}

	var routerOptions = {
		notfound: routeNotFound
	}

	router = new Router(routes).configure(routerOptions);

	// establish base priorities for daimons
	var evidencePriority = 0;
	var vocabularyPriority = 0;
	var densityPriority = 0;

	// initialize all service information asynchronously
	$.each(pageModel.services(), function (serviceIndex, service) {
		service.sources = [];
		var servicePromise = $.Deferred();
		initPromises.push(servicePromise);

		$.ajax({
			url: service.url + 'source/sources',
			method: 'GET',
			contentType: 'application/json',
			success: function (sources) {
				service.available = true;
				var completedSources = 0;

				$.each(sources, function (sourceIndex, source) {
					source.hasVocabulary = false;
					source.hasEvidence = false;
					source.hasResults = false;
					source.vocabularyUrl = '';
					source.evidenceUrl = '';
					source.resultsUrl = '';
					source.error = '';

					source.initialized = true;
					for (var d = 0; d < source.daimons.length; d++) {
						var daimon = source.daimons[d];

						// evaluate vocabulary daimons
						if (daimon.daimonType == 'Vocabulary') {
							source.hasVocabulary = true;
							source.vocabularyUrl = service.url + source.sourceKey + '/vocabulary/';
							if (daimon.priority >= vocabularyPriority) {
								vocabularyPriority = daimon.priority;
								pageModel.vocabularyUrl(source.vocabularyUrl);
							}
						}

						// evaluate evidence daimons
						if (daimon.daimonType == 'Evidence') {
							source.hasEvidence = true;
							source.evidenceUrl = service.url + source.sourceKey + '/evidence/';
							if (daimon.priority >= evidencePriority) {
								evidencePriority = daimon.priority;
								pageModel.evidenceUrl(source.evidenceUrl);
							}
						}

						// evaluate results daimons
						if (daimon.daimonType == 'Results') {
							source.hasResults = true;
							source.resultsUrl = service.url + source.sourceKey + '/cdmresults/';
							if (daimon.priority >= densityPriority) {
								densityPriority = daimon.priority;
								pageModel.resultsUrl(source.resultsUrl);
							}
						}
					}

					service.sources.push(source);

					$.ajax({
						url: service.url + source.sourceKey + '/vocabulary/info',
						timeout: 5000,
						method: 'GET',
						contentType: 'application/json',
						success: function (info) {
							completedSources++;
							source.version = info.version;
							source.dialect = info.dialect;

							if (completedSources == sources.length) {
								servicePromise.resolve();
							}
						},
						error: function (err) {
							completedSources++;
							source.initialized = false;
							pageModel.initializationErrors++;
							source.error = err.statusText;
							source.version = 'unknown';
							source.dialect = 'unknown';
							source.url = service.url + source.sourceKey + '/';
							if (completedSources == sources.length) {
								servicePromise.resolve();
							}
						}
					});
				});
			},
			error: function (xhr, ajaxOptions, thrownError) {
				service.available = false;
				service.xhr = xhr;
				service.thrownError = thrownError;
				servicePromise.resolve();

				pageModel.appInitializationFailed(true);
				pageModel.currentView('configure');
			}
		});
	});

	$.when.apply($, initPromises).done(initComplete);
	ko.applyBindings(pageModel);
});

function initComplete() {
	pageModel.currentView('search');
	router.init();
}

function routeNotFound(d) {
	// for debug use
}

function renderCohortDefinitionLink(s, p, d) {
	return '<a href=\"#/cohortdefinition/' + d.id + '\">' + d.name + '</a>';
}

function renderLink(s, p, d) {
	var valid = d.INVALID_REASON_CAPTION == 'Invalid' ? 'invalid' : '';
	return '<a class="' + valid + '" href=\"#/concept/' + d.CONCEPT_ID + '\">' + d.CONCEPT_NAME + '</a>';
}

function renderBoundLink(s, p, d) {
	return '<a href=\"#/concept/' + d.concept.CONCEPT_ID + '\">' + d.concept.CONCEPT_NAME + '</a>';
}

function renderConceptSetItemSelector(s, p, d) {
	var css = '';
	if (pageModel.selectedConceptsIndex[d.concept.CONCEPT_ID] == 1) {
		css = ' selected';
	}
	return '<i class="fa fa-shopping-cart' + css + '"></i>';
}

function renderConceptSelector(s, p, d) {
	var css = '';
	var icon = 'fa-shopping-cart';

	if (pageModel.selectedConceptsIndex[d.CONCEPT_ID] == 1) {
		css = ' selected';
	}
	return '<i class="fa ' + icon + ' ' + css + '"></i>';
}

function renderCurrentConceptSelector() {
	var css = '';
	if (pageModel.selectedConceptsIndex[pageModel.currentConcept().CONCEPT_ID] == 1) {
		css = ' selected';
	}
	return '<i class="fa fa-shopping-cart' + css + '"></i>';
}

function renderCheckbox(field) {
	return '<span data-bind="click: function(d) { d.' + field + '(!d.' + field + '()); pageModel.resolveConceptSetExpression(); } ,css: { selected: ' + field + '} " class="glyphicon glyphicon-ok"></span>';
}


function search(query) {
	pageModel.currentView('loading');

	filters = [];
	$('#querytext').blur();

	$.ajax({
		url: pageModel.vocabularyUrl() + 'search/' + query,
		success: function (results) {
			if (results.length == 0) {
				alert('no search results for ' + decodeURI(query));
				pageModel.currentView('search');
			}

			var searchResultIdentifiers = [];
			for (c = 0; c < results.length; c++) {
				searchResultIdentifiers.push(results[c].CONCEPT_ID);
			}

			// load data density
			var densityPromise = $.Deferred();
			var densityIndex = {};

			$.ajax({
				url: pageModel.resultsUrl() + 'conceptDensity',
				method: 'POST',
				contentType: 'application/json',
				timeout: 10000,
				data: JSON.stringify(searchResultIdentifiers),
				success: function (entries) {
					for (var e = 0; e < entries.length; e++) {
						densityIndex[entries[e].key] = entries[e].value;
					}
					densityPromise.resolve();
				},
				error: function (error) {
					densityPromise.resolve();
				}
			});

			$.when(densityPromise).done(function () {
				feTemp = new FacetEngine({
					Facets: [
						{
							'caption': 'Vocabulary',
							'binding': function (o) {
								return o.VOCABULARY_ID;
							}
						},
						{
							'caption': 'Class',
							'binding': function (o) {
								return o.CONCEPT_CLASS_ID;
							}
						},
						{
							'caption': 'Domain',
							'binding': function (o) {
								return o.DOMAIN_ID;
							}
						},
						{
							'caption': 'Standard Concept',
							'binding': function (o) {
								return o.STANDARD_CONCEPT_CAPTION;
							}
						},
						{
							'caption': 'Invalid Reason',
							'binding': function (o) {
								return o.INVALID_REASON_CAPTION;
							}
						},
						{
							'caption': 'Has Data',
							'binding': function (o) {
								return o.DENSITY > 0;
							}
						}
					]
				});

				for (c = 0; c < results.length; c++) {
					var concept = results[c];
					if (densityIndex[concept.CONCEPT_ID] != undefined) {
						concept.DENSITY = densityIndex[concept.CONCEPT_ID];
					} else {
						concept.DENSITY = 0;
					}

					feTemp.Process(concept);
				}

				feTemp.MemberSortFunction = function () {
					return this.ActiveCount
				};
				feTemp.sortFacetMembers();

				pageModel.feSearch(feTemp);

				var tempCaption;

				if (decodeURI(query).length > 20) {
					tempCaption = decodeURI(query).substring(0, 20) + '...';
				} else {
					tempCaption = decodeURI(query);
				}

				lastQuery = {
					query: query,
					caption: tempCaption,
					resultLength: results.length
				};
				pageModel.currentSearch(query);

				var exists = false;
				for (i = 0; i < pageModel.recentSearch().length; i++) {
					if (pageModel.recentSearch()[i].query == query)
						exists = true;
				}
				if (!exists) {
					pageModel.recentSearch.unshift(lastQuery);
				}
				if (pageModel.recentSearch().length > 7) {
					pageModel.recentSearch.pop();
				}

				pageModel.currentView('searchResults');
				pageModel.searchResultsConcepts(pageModel.feSearch().GetCurrentObjects());
			});
		},
		error: function (xhr, message) {
			alert('error while searching ' + message);
		}
	});
}

function mapMonthYearDataToSeries(data, options) {
	var defaults = {
		dateField: "x",
		yValue: "y",
		yPercent: "p"
	};

	var options = $.extend({}, defaults, options);

	var series = {};
	series.name = "All Time";
	series.values = [];
	for (var i = 0; i < data[options.dateField].length; i++) {
		var dateInt = data[options.dateField][i];
		series.values.push({
			xValue: new Date(Math.floor(data[options.dateField][i] / 100), (data[options.dateField][i] % 100) - 1, 1),
			yValue: data[options.yValue][i],
			yPercent: data[options.yPercent][i]
		});
	}
	series.values.sort(function (a, b) {
		return a.xValue - b.xValue;
	});

	return [series]; // return series wrapped in an array
}

function importConceptSetExpression() {
	var expressionJson = $('#textImportConceptSet').val();
	var items = JSON.parse(expressionJson).items;
	for (var i = 0; i < items.length; i++) {
		var conceptSetItem = {}

		conceptSetItem.concept = items[i].concept;
		conceptSetItem.isExcluded = ko.observable(items[i].isExcluded);
		conceptSetItem.includeDescendants = ko.observable(items[i].includeDescendants);
		conceptSetItem.includeMapped = ko.observable(items[i].includeMapped);

		pageModel.selectedConceptsIndex[items[i].concept.CONCEPT_ID] = 1;
		pageModel.selectedConcepts.push(conceptSetItem);
	}
}

function importConceptIdentifiers() {
	var identifers = $('#textImportConceptIdentifiers').val().match(/[0-9]+/g); // all numeric sequences
	$.ajax({
		url: pageModel.vocabularyUrl() + 'lookup',
		method: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(identifers),
		success: function (data) {
			pageModel.importedConcepts(data);
			$('#wrapperImportConceptIdentifiers .fa-shopping-cart').trigger('click');
		}
	});
}

function clearConceptSet() {
	pageModel.selectedConcepts([]);
	pageModel.selectedConceptsIndex = {};
	pageModel.analyzeSelectedConcepts();
	pageModel.resolveConceptSetExpression();
}

function selectAllSearchResults() {
	// currently bugged, only selecting current page..
	//$($('#tableSearchResults').DataTable().cells().nodes()).find('.fa-shopping-cart').trigger('click')
	$('#wrapperSearchResultsTable .fa-shopping-cart:not(.selected)').trigger('click');
}

function selectAllRelated() {
	var nodes = $($('.conceptTable').DataTable().rows({
		'search': 'applied'
	}).nodes());

	for (var i = 0; i < nodes.length; i++) {
		var concept = ko.contextFor(nodes[i]).$data;
		if (pageModel.selectedConceptsIndex[concept.CONCEPT_ID] == undefined) {
			var conceptSetItem = pageModel.createConceptSetItem(concept);
			pageModel.selectedConcepts.push(conceptSetItem);
			pageModel.selectedConceptsIndex[concept.CONCEPT_ID] = 1;
		}
	}

	pageModel.analyzeSelectedConcepts();
}

function contextSensitiveLinkColor(row, data) {
	var switchContext;

	if (data.STANDARD_CONCEPT == undefined) {
		switchContext = data.concept.STANDARD_CONCEPT;
	} else {
		switchContext = data.STANDARD_CONCEPT;
	}

	switch (switchContext) {
	case 'N':
		$('a', row).css('color', '#800');
		break;
	case 'C':
		$('a', row).css('color', '#080');
		break;
	}
}

// metadata based categorization routine
function metagorize(metarchy, related) {
	var concept = pageModel.currentConcept();
	var key = concept.VOCABULARY_ID + '.' + concept.CONCEPT_CLASS_ID;
	if (metatrix[key] != undefined) {
		var meta = metatrix[key];
		if (hasRelationship(related, meta.childRelationships)) {
			metarchy.children.push(related);
		}
		if (hasRelationship(related, meta.parentRelationships)) {
			metarchy.parents.push(related);
		}
		if (hasRelationship(related, meta.synonymRelationships)) {
			metarchy.synonyms.push(related);
		}
	}
}

function hasRelationship(concept, relationships) {
	for (var r = 0; r < concept.RELATIONSHIPS.length; r++) {
		for (var i = 0; i < relationships.length; i++) {
			if (concept.RELATIONSHIPS[r].RELATIONSHIP_NAME == relationships[i]) {
				return true;
			}
		}
	}
	return false;
}

function loadCohortDefinition(cohortDefinitionId) {
	pageModel.currentView('loading');

	var definitionPromise = $.ajax({
		url: pageModel.services()[0].url + 'cohortdefinition/' + cohortDefinitionId,
		method: 'GET',
		contentType: 'application/json',
		success: function (cohortDefinition) {
			pageModel.currentCohortDefinition(cohortDefinition);
		}
	});

	var infoPromise = $.ajax({
		url: pageModel.services()[0].url + 'cohortdefinition/' + cohortDefinitionId + '/info',
		method: 'GET',
		contentType: 'application/json',
		success: function (generationInfo) {
			pageModel.currentCohortDefinitionInfo(generationInfo);
		}
	});

	$.when(infoPromise, definitionPromise).done(function (ip, dp) {
		// now that we have required information lets compile them into data objects for our view
		var cdmSources = pageModel.services()[0].sources.filter(hasCDM);
		var results = [];

		for (var s = 0; s < cdmSources.length; s++) {
			var source = cdmSources[s];

			pageModel.sourceAnalysesStatus[source.sourceKey] = ko.observable({
				ready: false,
				checking: false
			});

			var sourceInfo = getSourceInfo(source);
			var cdsi = {};
			cdsi.name = cdmSources[s].sourceName;

			if (sourceInfo != null) {
				cdsi.isValid = sourceInfo.isValid;
				cdsi.status = sourceInfo.status;
				var date = new Date(sourceInfo.startTime);
				cdsi.startTime = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
				cdsi.executionDuration = (sourceInfo.executionDuration / 1000) + 's'
				cdsi.distinctPeople = asyncComputed(getCohortCount, this, source);
			} else {
				cdsi.isValid = false;
				cdsi.status = 'n/a';
				cdsi.startTime = 'n/a';
				cdsi.executionDuration = 'n/a';
				cdsi.distinctPeople = 'n/a';
			}

			results.push(cdsi);
		}

		pageModel.cohortDefinitionSourceInfo(results);

		// load universe of analyses
		var analysesPromise = $.ajax({
			url: pageModel.services()[0].url + 'cohortanalysis/',
			method: 'GET',
			contentType: 'application/json',
			success: function (analyses) {
				var index = {};
				var nestedAnalyses = [];

				for (var a = 0; a < analyses.length; a++) {
					var analysis = analyses[a];

					if (index[analysis.analysisType] == undefined) {
						var analysisType = {
							name: analysis.analysisType,
							analyses: []
						};
						nestedAnalyses.push(analysisType);
						index[analysis.analysisType] = nestedAnalyses.indexOf(analysisType);
					}
					pageModel.analysisLookup[analysis.analysisId] = analysis.analysisType;
					nestedAnalyses[index[analysis.analysisType]].analyses.push(analysis);
				}

				pageModel.cohortAnalyses(nestedAnalyses);

				// obtain completed result status for each source
				for (var s = 0; s < cdmSources.length; s++) {
					var source = cdmSources[s];
					var info = getSourceInfo(source);
					if (info) {
						var sourceAnalysesStatus = {};
						sourceAnalysesStatus.checking = true;
						pageModel.sourceAnalysesStatus[source.sourceKey](sourceAnalysesStatus);
						getCompletedAnalyses(source);
					}
				}
			}
		});

		pageModel.currentView('cohortdefinition');
	});

}

function hasCDM(source) {
	for (var d = 0; d < source.daimons.length; d++) {
		if (source.daimons[d].daimonType == 'CDM') {
			return true;
		}
	}
	return false;
}

function hasResults(source) {
	for (var d = 0; d < source.daimons.length; d++) {
		if (source.daimons[d].daimonType == 'Results') {
			return true;
		}
	}
	return false;
}

function getSourceInfo(source) {
	var info = pageModel.currentCohortDefinitionInfo();
	for (var i = 0; i < info.length; i++) {
		if (info[i].id.sourceId == source.sourceId) {
			return info[i];
		}
	}
}

function loadConcept(conceptId) {

	pageModel.currentView('loading');

	var conceptPromise = $.ajax({
		url: pageModel.vocabularyUrl() + 'concept/' + conceptId,
		method: 'GET',
		contentType: 'application/json',
		success: function (c, status, xhr) {
			var exists = false;
			for (i = 0; i < pageModel.recentConcept().length; i++) {
				if (pageModel.recentConcept()[i].CONCEPT_ID == c.CONCEPT_ID)
					exists = true;
			}
			if (!exists) {
				pageModel.recentConcept.unshift(c);
			}
			if (pageModel.recentConcept().length > 7) {
				pageModel.recentConcept.pop();
			}

			pageModel.currentConcept(c);
			pageModel.currentView('concept');
			// pageModel.currentConceptMode('hierarchy'); // debug default
		},
		error: function () {
			alert('An error occurred while attempting to load the concept from your currently configured provider.  Please check the status of your selection from the configuration button in the top right corner.');
		}
	});

	// load related concepts once the concept is loaded
	pageModel.loadingRelated(true);
	var relatedPromise = $.Deferred();

	$.when(conceptPromise).done(function () {
		metarchy = {
			parents: ko.observableArray(),
			children: ko.observableArray(),
			synonyms: ko.observableArray()
		};

		$.getJSON(pageModel.vocabularyUrl() + 'concept/' + conceptId + '/related', function (related) {
			pageModel.relatedConcepts(related);

			var feTemp = new FacetEngine({
				Facets: [
					{
						'caption': 'Vocabulary',
						'binding': function (o) {
							return o.VOCABULARY_ID;
						}
				},
					{
						'caption': 'Standard Concept',
						'binding': function (o) {
							return o.STANDARD_CONCEPT_CAPTION;
						}
				},
					{
						'caption': 'Invalid Reason',
						'binding': function (o) {
							return o.INVALID_REASON_CAPTION;
						}
				},
					{
						'caption': 'Class',
						'binding': function (o) {
							return o.CONCEPT_CLASS_ID;
						}
				},
					{
						'caption': 'Domain',
						'binding': function (o) {
							return o.DOMAIN_ID;
						}
				},
					{
						'caption': 'Relationship',
						'binding': function (o) {
							values = [];
							for (i = 0; i < o.RELATIONSHIPS.length; i++) {
								values.push(o.RELATIONSHIPS[i].RELATIONSHIP_NAME);
							}
							return values;
						}
				},
					{
						'caption': 'Distance',
						'binding': function (o) {
							values = [];
							for (i = 0; i < o.RELATIONSHIPS.length; i++) {
								if (values.indexOf(o.RELATIONSHIPS[i].RELATIONSHIP_DISTANCE) == -1) {
									values.push(o.RELATIONSHIPS[i].RELATIONSHIP_DISTANCE);
								}
							}
							return values;
						}
				}
			]
			});

			for (c = 0; c < related.length; c++) {
				feTemp.Process(related[c]);
				metagorize(metarchy, related[c]);
			}

			pageModel.metarchy = metarchy;

			feTemp.MemberSortFunction = function () {
				return this.ActiveCount;
			};
			feTemp.sortFacetMembers();

			pageModel.feRelated(feTemp);
			pageModel.relatedConcepts(pageModel.feRelated().GetCurrentObjects());
			relatedPromise.resolve();
		});
	});

	$.when(relatedPromise).done(function () {
		pageModel.loadingRelated(false);
	});

	// triggers once our async loading of the concept and related concepts is complete
	$.when(conceptPromise).done(function () {
		pageModel.currentView('concept');
	});
}

function exportConceptIdentifiers() {
	var includedConcepts = [];
	for (var i = 0; i < pageModel.includedConcepts().length; i++) {
		includedConcepts.push(pageModel.includedConcepts()[i].CONCEPT_ID);
	}
}

function getCohortCount(source) {
	var sourceKey = source.sourceKey;
	var cohortDefinitionId = pageModel.currentCohortDefinition().id;
	return $.ajax(pageModel.services()[0].url + sourceKey + '/cohortresults/' + cohortDefinitionId + '/distinctPersonCount', {});
}

function getCompletedAnalyses(source) {
	var cohortDefinitionId = pageModel.currentCohortDefinition().id;

	$.ajax(pageModel.services()[0].url + source.sourceKey + '/cohortresults/' + cohortDefinitionId + '/analyses', {
		success: function (analyses) {
			sourceAnalysesStatus = {};

			// initialize cohort analyses status
			for (var i = 0; i < pageModel.cohortAnalyses().length; i++) {
				sourceAnalysesStatus[pageModel.cohortAnalyses()[i].name] = 0;
			}

			// capture statistics on the number of each analysis type that was completed
			for (var a = 0; a < analyses.length; a++) {
				var analysisType = pageModel.analysisLookup[analyses[a]];
				sourceAnalysesStatus[analysisType] = sourceAnalysesStatus[analysisType] + 1;
			}
			sourceAnalysesStatus.ready = true;
			pageModel.sourceAnalysesStatus[source.sourceKey](sourceAnalysesStatus);
		}
	});
}

function asyncComputed(evaluator, owner, args) {
	var result = ko.observable('<i class="fa fa-refresh fa-spin"></i>');

	ko.computed(function () {
		evaluator.call(owner, args).done(result);
	});

	return result;
}

function generateAnalyses(data, event) {
	console.log(event.target);
	$(event.target).prop("disabled", true);

	var requestedAnalysisTypes = [];
	$('input[type="checkbox"][name="' + data.sourceKey + '"]:checked').each(function () {
		requestedAnalysisTypes.push($(this).val());
	});
	var analysisIdentifiers = [];

	var analysesTypes = pageModel.cohortAnalyses();
	for (var i = 0; i < analysesTypes.length; i++) {
		if (requestedAnalysisTypes.indexOf(analysesTypes[i].name) >= 0) {
			for (var j = 0; j < analysesTypes[i].analyses.length; j++) {
				analysisIdentifiers.push(analysesTypes[i].analyses[j].analysisId);
			}
		}
	}

	if (analysisIdentifiers.length > 0) {
		$(event.target).prop('value', 'Starting job...');
		var cohortDefinitionId = pageModel.currentCohortDefinition().id;
		var cohortJob = {};

		cohortJob.jobName = 'HERACLES' + '_COHORT_' + cohortDefinitionId + '_' + data.sourceKey;
		cohortJob.sourceKey = data.sourceKey;
		cohortJob.smallCellCount = 5;
		cohortJob.cohortDefinitionIds = [];
		cohortJob.cohortDefinitionIds.push(cohortDefinitionId);
		cohortJob.analysisIds = analysisIdentifiers;
		cohortJob.runHeraclesHeel = false;
		cohortJob.cohortPeriodOnly = false;

		// set concepts
		cohortJob.conditionConceptIds = [];
		cohortJob.drugConceptIds = [];
		cohortJob.procedureConceptIds = [];
		cohortJob.observationConceptIds = [];
		cohortJob.measurementConceptIds = [];

		console.log("Submitting to cohort analysis service:");
		console.log(cohortJob);

		$.ajax({
			url: pageModel.services()[0].url + 'cohortanalysis',
			data: JSON.stringify(cohortJob),
			method: 'POST',
			contentType: 'application/json',
			success: function (info) {
				console.log(info);
			}
		});
	} else {
		$(event.target).prop("disabled", false);
	}
}
