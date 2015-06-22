function ViewModel() {
	var self = this;

	self.loadingRelated = ko.observable(false);
	self.loadingEvidence = ko.observable(false);
	self.loadingReport = ko.observable(false);
	self.loadingReportDrilldown = ko.observable(false);

	self.activeReportDrilldown = ko.observable(false);

	self.cohortAnalyses = ko.observableArray();
	self.currentReport = ko.observable();
	self.reports = ko.observableArray(['Person', 'Cohort Specific', 'Conditions by Index', 'Drugs by Index']);
	self.reportCohortDefinitionId = ko.observable(31);
	self.reportReportName = ko.observable();
	self.reportSourceKey = ko.observable();
	self.reportValid = ko.computed(function () {
		return (self.reportReportName() != undefined && self.reportSourceKey() != undefined && self.reportCohortDefinitionId() != undefined && !self.loadingReport() && !self.loadingReportDrilldown());
	}, this);
	self.jobs = ko.observableArray();
	self.sourceAnalysesStatus = {};
	self.analysisLookup = {};
	self.cohortDefinitionSourceInfo = ko.observableArray();
	self.recentSearch = ko.observableArray(null);
	self.recentConcept = ko.observableArray(null);
	self.currentSearch = ko.observable();
	self.currentView = ko.observable();
	self.conceptSetInclusionIdentifiers = ko.observableArray();
	self.currentConceptSetExpressionJson = ko.observable();
	self.currentConceptIdentifierList = ko.observable();
	self.currentIncludedConceptIdentifierList = ko.observable();
	self.searchResultsConcepts = ko.observableArray();
	self.relatedConcepts = ko.observableArray();
	self.importedConcepts = ko.observableArray();
	self.includedConcepts = ko.observableArray();
	self.cohortDefinitions = ko.observableArray();
	self.currentCohortDefinition = ko.observable();
	self.currentCohortDefinitionInfo = ko.observable();
	self.resolvingConceptSetExpression = ko.observable();
	self.evidence = ko.observableArray();
	self.services = ko.observableArray(configuredServices);
	self.initializationErrors = 0;
	self.vocabularyUrl = ko.observable();
	self.evidenceUrl = ko.observable();
	self.resultsUrl = ko.observable();
	self.currentConcept = ko.observable();
	self.currentConceptMode = ko.observable('details');
	self.currentConceptSetMode = ko.observable('details');
	self.currentImportMode = ko.observable('identifiers');
	self.feRelated = ko.observable();
	self.feSearch = ko.observable();
	self.metarchy = {};
	self.prompts = ko.observableArray(); // todo: remove?
	self.selectedConcepts = ko.observableArray(null);
	self.selectedConceptsWarnings = ko.observableArray();
	self.checkCurrentSource = function (source) {
		return source.url == pageModel.curentVocabularyUrl();
	};
	self.renderHierarchyLink = function (d) {
		var valid = d.INVALID_REASON_CAPTION == 'Invalid' || d.STANDARD_CONCEPT != 'S' ? 'invalid' : '';
		return '<a class="' + valid + '" href=\"#/concept/' + d.CONCEPT_ID + '\">' + d.CONCEPT_NAME + '</a>';
	};
	self.loadJobs = function () {
		$.ajax({
			url: pageModel.services()[0].url + 'job/execution?comprehensivePage=true',
			method: 'GET',
			contentType: 'application/json',
			success: function (jobs) {
				for (var j = 0; j < jobs.content.length; j++) {
					var startDate = new Date(jobs.content[j].startDate);
					jobs.content[j].startDate = startDate.toLocaleDateString() + ' ' + startDate.toLocaleTimeString();

					var endDate = new Date(jobs.content[j].endDate);
					jobs.content[j].endDate = endDate.toLocaleDateString() + ' ' + endDate.toLocaleTimeString();

					if (jobs.content[j].jobParameters.jobName == undefined) {
						jobs.content[j].jobParameters.jobName = 'n/a';
					}
				}
				pageModel.jobs(jobs.content);
				pageModel.currentView('jobs');
			}
		});
	};
	self.analyzeSelectedConcepts = function () {
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
	};
	self.selectedConceptsIndex = {};
	self.createConceptSetItem = function (concept) {
		var conceptSetItem = {};

		conceptSetItem.concept = concept;
		conceptSetItem.isExcluded = ko.observable(false);
		conceptSetItem.includeDescendants = ko.observable(false);
		conceptSetItem.includeMapped = ko.observable(false);
		return conceptSetItem;
	};
	self.conceptSetInclusionCount = ko.observable(0);
	self.resolveConceptSetExpression = function () {
		pageModel.resolvingConceptSetExpression(true);
		var conceptSetExpression = '{"items" :' + ko.toJSON(pageModel.selectedConcepts()) + '}';
		var highlightedJson = pageModel.syntaxHighlight(conceptSetExpression);
		pageModel.currentConceptSetExpressionJson(highlightedJson);
	};
	self.syntaxHighlight = function (json) {
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
	};
	self.checkExecuteSearch = function (data, e) {
		if (e.keyCode == 13) { // enter
			var query = $('#querytext').val();
			if (query.length > 2) {
				document.location = "#/search/" + encodeURI(query);
			} else {
				$('#helpMinimumQueryLength').modal('show')
			}
		}
	};
	self.updateSearchFilters = function () {
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
	};
	self.updateRelatedFilters = function () {
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
	};
	self.selectConcept = function (concept) {
		document.location = '#/concept/' + concept.CONCEPT_ID;
	};
}
