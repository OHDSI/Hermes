var router;
var pageModel;
var initPromises = [];

$(document).ready(function () {
	$.support.cors = true;
	$('#querytext').focus();

	pageModel = {
		data: {
			monthlyConditionPrevalence: ko.observable(),
			monthlyConditionEraPrevalence: ko.observable()
		},
		recentSearch: ko.observableArray(null),
		recentConcept: ko.observableArray(null),
		currentSearch: ko.observable(),
		currentView: ko.observable(),
		conceptSetInclusionIdentifiers: ko.observableArray(),
		currentConceptSetExpressionJson: ko.observable(),
		currentConceptIdentifierList: ko.observable(),
		currentIncludedConceptIdentifierList: ko.observable(),
		searchResultsConcepts: ko.observableArray(),
		relatedConcepts: ko.observableArray(),
		importedConcepts: ko.observableArray(),
		includedConcepts: ko.observableArray(),
		loadingRelated: ko.observable(),
		loadingEvidence: ko.observable(),
		resolvingConceptSetExpression: ko.observable(),
		evidence: ko.observableArray(),
		services: ko.observableArray(configuredServices),
		initializationErrors: 0,
		vocabularyUrl: ko.observable(),
		evidenceUrl: ko.observable(),
		resultsUrl: ko.observable(),
		currentConcept: ko.observable(),
		currentConceptMode: ko.observable('details'),
		currentConceptSetMode: ko.observable('details'),
		currentImportMode: ko.observable('identifiers'),
		feRelated: ko.observable(),
		feSearch: ko.observable(),
		metarchy: {},
		prompts: ko.observableArray(), // todo: remove?
		selectedConcepts: ko.observableArray(null),
		selectedConceptsWarnings: ko.observableArray(),
		checkCurrentSource: function (source) {
			return source.url == pageModel.curentVocabularyUrl();
		},
		renderHierarchyLink: function (d) {
			var valid = d.INVALID_REASON_CAPTION == 'Invalid' || d.STANDARD_CONCEPT != 'S' ? 'invalid' : '';
			return '<a class="' + valid + '" href=\"#/concept/' + d.CONCEPT_ID + '\">' + d.CONCEPT_NAME + '</a>';
		},
		analyzeSelectedConcepts: function () {
			pageModel.selectedConceptsWarnings.removeAll();
			var domains = [];
			var standards = [];
			var includeNonStandard = false;

			for (var i = 0; i < pageModel.selectedConcepts().length; i++) {
				var domain = pageModel.selectedConcepts()[i].concept.DOMAIN_ID;
				var standard = pageModel.selectedConcepts()[i].concept.STANDARD_CONCEPT_CAPTION;

				if (standard != 'Standard') {
					includeNonStandard = true;
				}

				var index;

				index = $.inArray(domain, domains);
				if (index < 0) {
					domains.push(domain);
				}

				index = $.inArray(standard, standards);
				if (index < 0) {
					standards.push(standard);
				}

			}

			if (domains.length > 1) {
				pageModel.selectedConceptsWarnings.push('Your saved concepts come from multiple Domains (' + domains.join(', ') + ').  A useful set of concepts will typically all come from the same Domain.');
			}

			if (standards.length > 1) {
				pageModel.selectedConceptsWarnings.push('Your saved concepts include different standard concept types (' + standards.join(', ') + ').  A useful set of concepts will typically all be of the same standard concept type.');
			}

			if (includeNonStandard) {
				pageModel.selectedConceptsWarnings.push('Your saved concepts include Non-Standard or Classification concepts.  Typically concept sets should only include Standard concepts unless advanced use of this concept set is planned.');
			}
		},
		selectedConceptsIndex: {},
		activatePrompt: function (prompt) {
			pageModel.feRelated().SetFilter(prompt.filters);
			pageModel.relatedConcepts(pageModel.feRelated().GetCurrentObjects());
			pageModel.feRelated(pageModel.feRelated());
			var new_prompts = prompter.get_prompts(pageModel.currentConcept(), pageModel.feRelated());
			pageModel.prompts(new_prompts);

			$('#button_basic_filter').addClass('active');
		},
		clearPrompts: function () {
			pageModel.feRelated().SetFilter([]);
			pageModel.relatedConcepts(pageModel.feRelated().GetCurrentObjects());
			pageModel.feRelated(pageModel.feRelated());
			var new_prompts = prompter.get_prompts(pageModel.currentConcept(), pageModel.feRelated());
			pageModel.prompts(new_prompts);

			$('#button_basic_filter').removeClass('active');
		},
		createConceptSetItem: function (concept) {
			var conceptSetItem = {};

			conceptSetItem.concept = concept;
			conceptSetItem.isExcluded = ko.observable(false);
			conceptSetItem.includeDescendants = ko.observable(false);
			conceptSetItem.includeMapped = ko.observable(false);
			return conceptSetItem;
		},
		conceptSetInclusionCount: ko.observable(0),
		resolveConceptSetExpression: function () {
			pageModel.resolvingConceptSetExpression(true);
			var conceptSetExpression = '{"items" :' + ko.toJSON(pageModel.selectedConcepts()) + '}';
			var highlightedJson = pageModel.syntaxHighlight(conceptSetExpression);
			pageModel.currentConceptSetExpressionJson(highlightedJson);

			$.ajax({
				url: pageModel.vocabularyUrl() + 'resolveConceptSetExpression',
				data: conceptSetExpression,
				method: 'POST',
				contentType: 'application/json',
				success: function (info) {
					pageModel.conceptSetInclusionIdentifiers(info);
					pageModel.currentIncludedConceptIdentifierList(info.join(','));
					pageModel.conceptSetInclusionCount(info.length);
					pageModel.resolvingConceptSetExpression(false);
				},
				error: function (err) {
					alert(err);
					pageModel.resolvingConceptSetExpression(false);
				}
			});

		},
		syntaxHighlight: function (json) {
			if (typeof json != 'string') {
				json = JSON.stringify(json, undefined, 2);
			}
			json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
			return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
				var cls = 'number';
				if (/^"/.test(match)) {
					if (/:$/.test(match)) {
						cls = 'key';
					} else {
						cls = 'string';
					}
				} else if (/true|false/.test(match)) {
					cls = 'boolean';
				} else if (/null/.test(match)) {
					cls = 'null';
				}
				return '<span class="' + cls + '">' + match + '</span>';
			});
		},
		checkExecuteSearch: function (data, e) {
			if (e.keyCode == 13) { // enter
				var query = $('#querytext').val();
				if (query.length > 2) {
					document.location = "#/search/" + encodeURI(query);
				} else {
					$('#helpMinimumQueryLength').modal('show')
				}
			}
		},
		updateSearchFilters: function () {
			$(event.target).toggleClass('selected');

			var filters = [];
			$('#wrapperSearchResultsFilter .facetMemberName.selected').each(function (i, d) {
				filters.push(d.id);
			});
			pageModel.feSearch().SetFilter(filters);
			// update filter data binding
			pageModel.feSearch(pageModel.feSearch());
			// update table data binding
			pageModel.searchResultsConcepts(pageModel.feSearch().GetCurrentObjects());
		},
		updateRelatedFilters: function () {
			$(event.target).toggleClass('selected');

			var filters = [];
			$('#wrapperRelatedConceptsFilter .facetMemberName.selected').each(function (i, d) {
				filters.push(d.id);
			});
			pageModel.feRelated().SetFilter(filters);
			// update filter data binding
			pageModel.feRelated(pageModel.feRelated());
			// update table data binding
			pageModel.relatedConcepts(pageModel.feRelated().GetCurrentObjects());
		},
		selectConcept: function (concept) {
			document.location = '#/concept/' + concept.CONCEPT_ID;
		}
	};

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
		'/search/:query:': search
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

	for (var i=0; i<nodes.length; i++) {
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
