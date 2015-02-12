var router;
var page_model;
var fe_search;
var facet_hotkey_mode = false;
var concept_hotkey_mode = false;
var datatable_keyboard_mode = false;
var current_facet_index = 0;
var facet_selections = [];
var hotkey_handlers = [];
var hotkey_index = 0;

$(document).ready(function () {
	$.support.cors = true;

	page_model = {
		data: {
			monthlyConditionPrevalence: ko.observable(),
			monthlyConditionEraPrevalence: ko.observable()
		},
		ohdsi_services: ko.observableArray(ohdsi_services),
		ohdsi_service: ko.observable(ohdsi_services[0].url),
		current_facet: ko.observable(),
		current_concept: ko.observable(),
		related_concepts: ko.observableArray(),
		current_page_concepts: ko.observableArray(),
		current_page: ko.observable(0),
		fe_related: ko.observable(),
		prompts: ko.observableArray(),
		total_pages: 0,
		page_length: 9,
		selected_concepts: ko.observableArray(),
		selected_concepts_index: {},
		generated_codeset: ko.observable(),
		show_advanced_filters: ko.observable(false),
		modifier_key_down: false,
		updateService: function (service) {
			page_model.ohdsi_service(service.url);
			page_model.ohdsi_services(ohdsi_services);
		},
		activatePrompt: function (prompt) {
			page_model.fe_related().SetFilter(prompt.filters);
			page_model.related_concepts(page_model.fe_related().GetCurrentObjects());
			page_model.fe_related(page_model.fe_related());
			var new_prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
			page_model.prompts(new_prompts);

			$('#button_basic_filter').addClass('active');
		},
		clearPrompts: function () {
			page_model.fe_related().SetFilter([]);
			page_model.related_concepts(page_model.fe_related().GetCurrentObjects());
			page_model.fe_related(page_model.fe_related());
			var new_prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
			page_model.prompts(new_prompts);

			$('#button_basic_filter').removeClass('active');
		},
		selectAllConcepts: function () {
			$($('#dt_related').DataTable().rows({
				'search': 'applied'
			}).nodes()).addClass('selected');
		},
		clearSelectedConcepts: function () {
			$($('#dt_related').DataTable().rows().nodes()).removeClass('selected');
		},
		createConceptSetItem: function(concept) {
				var conceptSetItem = {};
				conceptSetItem.concept = {
					conceptId : concept.CONCEPT_ID,
					conceptName : concept.CONCEPT_NAME,
					conceptCode : concept.CONCEPT_CODE,
					vocabularyId : concept.VOCABULARY_ID,
					domainId: concept.DOMAIN_ID
				};

				conceptSetItem.isExcluded = ko.observable(false);
			 	conceptSetItem.includeDescendants = ko.observable(false);
				conceptSetItem.includeMapped = ko.observable(false);
			return conceptSetItem;
		},
		saveCurrentConcept: function () {
			var concept = page_model.current_concept();
			if (page_model.selected_concepts_index[concept.CONCEPT_ID] == 1) {
				// already in the bag
			} else {
				page_model.selected_concepts_index[concept.CONCEPT_ID] = 1;
				page_model.selected_concepts.push(page_model.createConceptSetItem(concept));
			}
		},
		saveSelectedConcepts: function () {
			var new_concepts = $('#dt_related').DataTable().rows('.selected', {
				'search': 'applied'
			}).data();
			var unwrapped = page_model.selected_concepts();

			for (var i = 0; i < new_concepts.length; i++) {
				if (page_model.selected_concepts_index[new_concepts[i].CONCEPT_ID] == 1) {
					// already in the bag
				} else {
					page_model.selected_concepts_index[new_concepts[i].CONCEPT_ID] = 1;
					unwrapped.push(page_model.createConceptSetItem(new_concepts[i]));
				}
			}
			page_model.selected_concepts(unwrapped);
		},
		removeSelectedConcepts: function () {
			var rows = $('#dt_selected tr>td>span.selected').closest('tr');
			var selected_concepts = $('#dt_selected').DataTable().rows(rows, {
				'search': 'applied'
			}).data();

			for (var i = 0; i < selected_concepts.length; i++) {
				delete page_model.selected_concepts_index[selected_concepts[i].concept.conceptId];
			}

			page_model.selected_concepts.remove(function (i) {
				return selected_concepts.indexOf(i) > -1;
			})
			page_model.generated_codeset(null);
		},
		removeAllSelectedConcepts: function () {
			page_model.selected_concepts_index = {};
			page_model.generated_codeset(null);
			page_model.selected_concepts.removeAll();
		},
		generateConceptIdList: function () {
			var comma_separated_codeset = '';
			for (var i = 0; i < page_model.selected_concepts().length; i++) {
				if (i > 0) {
					comma_separated_codeset += ', ';
				}
				comma_separated_codeset += page_model.selected_concepts()[i].concept.conceptId;
			}
			page_model.generated_codeset(comma_separated_codeset);
		},
		generateConceptList: function () {
			var json = ko.toJSON(page_model.selected_concepts(), undefined, 2);
			json = this.syntaxHighlight(json);
			page_model.generated_codeset(json);
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
		updateFilters: function () {
			$(event.target).toggleClass('selected');

			var filters = [];
			$('.selected.filterpanel_facet_member_name').each(function (i, d) {
				filters.push(d.id);
			});
			page_model.fe_related().SetFilter(filters);
			page_model.related_concepts(page_model.fe_related().GetCurrentObjects());
			page_model.fe_related(page_model.fe_related());
			var new_prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
			page_model.prompts(new_prompts);
		},
		previousPage: function () {
			page_model.current_page(Math.max(0, page_model.current_page() - 1));
			page_model.showConceptPage();
		},
		nextPage: function () {
			var objects = fe_search.GetCurrentObjects().length;
			var max_pages = Math.ceil(objects / page_model.page_length) - 1;
			page_model.current_page(Math.min(max_pages, page_model.current_page() + 1));
			page_model.showConceptPage();
		},
		showConceptPage: function () {
			page_model.current_page_concepts(fe_search.GetCurrentObjects().slice(page_model.current_page() * page_model.page_length, ((page_model.current_page() + 1) * page_model.page_length)));
		},
		resetHotkeys: function () {
			hotkey_handlers = [];
			hotkey_index = 0;
		},
		getUniqueHotkey: function (name) {
			name = name.toUpperCase();
			var current_hotkeys = []; // local cache

			for (var i = 0; i < hotkey_handlers.length; i++) {
				current_hotkeys.push(hotkey_handlers[i].key);
			}

			for (var i = 0; i < name.length; i++) {
				if (current_hotkeys.indexOf(name[i]) == -1 && name[i] != ' ' && name[i] != '-') {
					return name[i].toUpperCase();
				}
			}

			for (var i = 1; i < 100; i++) {
				if (current_hotkeys.indexOf(i.toString()) == -1) {
					return i.toString();
				}
			}
		},
		addConceptHotkey: function (concept_index) {
			var hotkey = concept_index;
			var hotkey_handler = {
				key: concept_index,
				action: function () {
					var current_concept = page_model.current_page_concepts()[hotkey - 1];
					page_model.selectConcept(current_concept)
				}
			};
			hotkey_handlers.push(hotkey_handler);
			return hotkey;
		},
		addHotkey: function (name) {
			var hotkey = page_model.getUniqueHotkey(name);
			var facet_member = fe_search.Facets[current_facet_index].Members[hotkey_index++];
			var hotkey_handler = {
				key: hotkey,
				action: function () {
					page_model.addFilter(facet_member);
				}
			};
			hotkey_handlers.push(hotkey_handler);
			return hotkey;
		},
		selectConcept: function (concept) {
			document.location = '#/concept/' + concept.CONCEPT_ID;
		},
		addFilter: function (member) {
			var filters = fe_search.GetCurrentFilter();
			member_index = fe_search.Facets[current_facet_index].Members.indexOf(member);
			filter = current_facet_index + '-' + member_index;
			filters.push(filter);
			fe_search.SetFilter(filters);
			current_facet_index++;
			page_model.total_pages = Math.ceil(fe_search.GetCurrentObjectCount() / page_model.page_length);

			page_model.resetHotkeys();
			page_model.current_facet(fe_search.Facets[current_facet_index]);

			// only display if we are out of facets..
			if (current_facet_index == fe_search.Facets.length) {
				facet_hotkey_mode = false;
				concept_hotkey_mode = true;
				page_model.showConceptPage();
			}
		}
	};

	$.each(ohdsi_services, function (index, service) {
		$.ajax({
			url: service.url + 'vocabulary/info',
			async: false,
			method: 'GET',
			contentType: 'application/json',
			success: function (info) {
				service.version = info.version;
				service.dialect = info.dialect;
			},
			error: function (err) {
				service.version = 'unknown';
				service.dialect = 'unknown';
			}
		});
	});

	var routes = {
		'/concept/:concept_id:': loadConcept
	}


	$(document).on('click', '#dt_related tr', function () {
		$(this).toggleClass('selected');
	});

  $(document).on('click', '#dt_selected > tbody > tr > td > span.glyphicon-ok-sign', function () {
		$(this).toggleClass('selected');
	});

	router = new Router(routes);
	router.init();

	// prevent keyboard hype while typing in datatable search box
	$(document).on('focusin', 'input[type="search"]', function () {
		datatable_keyboard_mode = true;
	});
	$(document).on('focusout', 'input[type="search"]', function () {
		datatable_keyboard_mode = false;
	});

	// keyboard hype
	$(document).keyup(function (e) {
		page_model.modifier_key_down = false;
	});

	$(document).keydown(function (e) {
		// prevent keyboard hype while typing in datatable search box
		if (datatable_keyboard_mode) {
			return;
		}

		if (e.keyCode == 17 || e.keyCode == 18) {
			page_model.modifier_key_down = true;
			return; // control key
		}

		if (page_model.modifier_key_down) {
			return;
		}

		if (concept_hotkey_mode) {
			if (e.keyCode == 27) {
				concept_hotkey_mode = false;
				$('#querytext').focus();
			}

			if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 188) {
				// back a page - up arrow, left arrow, comma (aka <)
				page_model.previousPage();
			} else if (e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 190) {
				// forward a page (down arrow, right arrow, period (aka >)
				page_model.nextPage();
			} else {
				for (var h = 0; h < hotkey_handlers.length; h++) {
					if (String.fromCharCode(e.keyCode) == hotkey_handlers[h].key) {
						hotkey_handlers[h].action();
					}
				}
			}
		} else if (facet_hotkey_mode) {
			if (e.keyCode == 27) {
				facet_hotkey_mode = false;
				$('#querytext').focus();
			}
			for (var i = 0; i < hotkey_handlers.length; i++) {
				if (String.fromCharCode(e.keyCode) == hotkey_handlers[i].key) {
					hotkey_handlers[i].action();
					break;
				}
			}
		} else {
			if (e.keyCode != 27) {
				$('#querytext').focus();
			} else {
				$('#search_panel_container').fadeOut(200);
			}
		}
	});

	//prevent flicker of panel on app switching
	$(window).on('blur', function () {
		$('#querytext').blur();
	});

	// show search panel while searching
	$('#querytext')
		.on('focus', function () {
			facet_hotkey_mode = false;
			concept_hotkey_mode = false;
		});

	// run search on enter
	$('#querytext').keydown(function (e) {
		if (e.keyCode == 13) { // enter
			var querystring = $('#querytext').val();
			if (querystring.length > 2) {
				$('#search_panel_container').slideDown(200);
				search(querystring);
			}
		}
	});

	$('#concept_panel_container').on('click', function () {
		$('#search_panel_container').fadeOut(200);
	});

	ko.applyBindings(page_model);
});

function toggleFilters() {
	$('#filter_control').toggleClass('selected');
	page_model.show_advanced_filters(!page_model.show_advanced_filters());

	$('#button_advanced_filter').toggleClass('active');
}

function renderLink(s, p, d) {
	var valid = d.INVALID_REASON == 'Invalid' ? 'invalid' : '';
	return '<a class="' + valid + '" href=\"#/concept/' + d.CONCEPT_ID + '\">' + d.CONCEPT_NAME + '</a>';
}

function renderBoundLink(s,p,d) {
	return '<a href=\"#/concept/' + d.concept.conceptId + '\">' + d.concept.conceptName + '</a>';
}

function renderSelected(s, p, d) {
	return '<span class="glyphicon glyphicon-ok-sign"></span>';
}

function renderCheckbox(field) {
	return '<span data-bind="click: function(d) { d.' + field + '(!d.' + field + '()); } ,css: { selected: ' + field + '} " class="glyphicon glyphicon-ok"></span>';
}

function resetSearchPanel() {
	page_model.current_facet(null);
	$('#searchpanel_error').html('');
	$('#searchpanel_error').hide();
}

function search(query) {
	// reset on new search
	resetSearchPanel();

	$('#searchpanel_searching').show();

	filters = [];
	facet_hotkey_mode = true;
	page_model.resetHotkeys();
	page_model.current_page_concepts([]);
	page_model.current_page(0);

	$('#querytext').blur();

	// reset current facet index
	current_facet_index = 0;

	$.ajax({
		url: page_model.ohdsi_service() + 'vocabulary/search/' + query,
		success: function (results) {
			if (results.length == 0) {
				$('#searchpanel_searching').hide();
				$('#searchpanel_error').html('Your search for "' + query + '" found no results. Press escape to change your search and try again.');
				$('#searchpanel_error').show()
				return;
			}

			$('#searchpanel_searching').hide();
			fe_search = new FacetEngine({
				Facets: [
					{
						'caption': 'Domain',
						'binding': function (o) {
							return o.DOMAIN_ID;
						}
					},
					{
						'caption': 'Standard Concept',
						'binding': function (o) {
							return o.STANDARD_CONCEPT;
						}
					},
					{
						'caption': 'Vocabulary',
						'binding': function (o) {
							return o.VOCABULARY_ID;
						}
					}
				]
			});

			for (c = 0; c < results.length; c++) {
				fe_search.Process(results[c]);
			}
			fe_search.MemberSortFunction = function () {
				return this.ActiveCount
			};
			fe_search.sortFacetMembers();

			page_model.current_facet(fe_search.Facets[0]);
			$('#search_panel_container').scrollTop(0);
		},
		error: function (xhr, message) {
			$('#searchpanel_searching').hide();
			$('#searchpanel_error').html('An error occurred while attempting to run a search.  The most likely cause of this error is that the selected WebAPI layer was not available.');
			$('#searchpanel_error').show()
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

function loadConcept(concept_id) {
	$('#welcome_panel_container').hide();

	$('#search_panel_container').fadeOut();
	$('#tablepanel').hide();
	$('#concept_panel_container').hide();
	$('#prompt_panel_container').hide();

	$('#loading_panel').show();

	concept_hotkey_mode = false;

	var concept_promise = $.ajax({
		url: page_model.ohdsi_service() + 'vocabulary/concept/' + concept_id,
		method: 'GET',
		contentType: 'application/json',
		success: function (c, status, xhr) {
			page_model.current_concept(c);
			$('#concept_panel_container').fadeIn();
		}
	});

	var data_promise = $.ajax({
		url: page_model.ohdsi_service() + 'cdmresults/' + concept_id + '/monthlyConditionOccurrencePrevalence',
		async: false,
		method: 'GET',
		contentType: 'application/json',
		success: function (data) {
			if (data.monthKey.length > 0) {
				var byMonthSeries = mapMonthYearDataToSeries(data, {
					dateField: 'monthKey',
					yValue: 'prevalence',
					yPercent: 'prevalence'
				});
				page_model.data.monthlyConditionPrevalence(byMonthSeries);
			} else {
				page_model.data.monthlyConditionPrevalence(null);
			}
		}
	});

	var related_promise = $.getJSON(page_model.ohdsi_service() + 'vocabulary/concept/' + concept_id + '/related', function (related) {
		page_model.related_concepts(related);

		var fe_temp = new FacetEngine({
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
						return o.STANDARD_CONCEPT;
					}
				},
				{
					'caption': 'Invalid Reason',
					'binding': function (o) {
						return o.INVALID_REASON;
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
			fe_temp.Process(related[c]);
		}
		fe_temp.MemberSortFunction = function () {
			return this.ActiveCount;
		};
		fe_temp.sortFacetMembers();

		page_model.fe_related(fe_temp);
		$('#tablepanel').fadeIn();
	});

	// triggers once our async loading of the concept and related concepts is complete
	$.when(related_promise, concept_promise, data_promise).done(function () {
		$('.conceptpanel_concept_details').tooltip();
		var prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
		page_model.prompts(prompts);
		$('#prompt_panel_container').show();
		$('#loading_panel').hide();
	});
}
