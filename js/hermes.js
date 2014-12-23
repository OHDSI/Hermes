var router;
var page_model;
var fe_search;
var facet_hotkey_mode = false;
var concept_hotkey_mode = false;
var current_facet_index = 0;
var facet_selections = [];
var hotkey_handlers = [];
var hotkey_index = 0;
var search_url = ohdsi_services_root + 'search/';
var get_concept_url = ohdsi_services_root + 'concept/';

$(document).ready(function () {
	var routes = {
		'/concept/:concept_id:': load_concept
	}

	router = new Router(routes);
	router.init();

	page_model = {
		current_facet: ko.observable(),
		current_concept: ko.observable(),
		related_concepts: ko.observableArray(),
		current_page_concepts: ko.observableArray(),
		current_page: ko.observable(0),
		fe_related: ko.observable(),
		prompts: ko.observableArray(),
		total_pages: 0,
		page_length: 9,
		modifier_key_down: false,
		activate_prompt: function (prompt) {
			page_model.fe_related().SetFilter(prompt.filters);
			page_model.related_concepts(page_model.fe_related().GetCurrentObjects());
			page_model.fe_related(page_model.fe_related());
			var new_prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
			page_model.prompts(new_prompts);
		},
		update_filters: function () {
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
		previous_page: function () {
			page_model.current_page(Math.max(0, page_model.current_page() - 1));
			page_model.show_concept_page();
		},
		next_page: function () {
			var objects = fe_search.GetCurrentObjects().length;
			var max_pages = Math.ceil(objects / page_model.page_length) - 1;
			page_model.current_page(Math.min(max_pages, page_model.current_page() + 1));
			page_model.show_concept_page();
		},
		show_concept_page: function () {
			page_model.current_page_concepts(fe_search.GetCurrentObjects().slice(page_model.current_page() * page_model.page_length, ((page_model.current_page() + 1) * page_model.page_length)));
		},
		reset_hotkeys: function () {
			hotkey_handlers = [];
			hotkey_index = 0;
		},
		get_unique_hotkey: function (name) {
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
		add_concept_hotkey: function (concept_index) {
			var hotkey = concept_index;
			var hotkey_handler = {
				key: concept_index,
				action: function () {
					var current_concept = page_model.current_page_concepts()[hotkey - 1];
					page_model.select_concept(current_concept)
				}
			};
			hotkey_handlers.push(hotkey_handler);
			return hotkey;
		},
		add_hotkey: function (name) {
			var hotkey = page_model.get_unique_hotkey(name);
			var facet_member = fe_search.Facets[current_facet_index].Members[hotkey_index++];
			var hotkey_handler = {
				key: hotkey,
				action: function () {
					page_model.add_filter(facet_member);
				}
			};
			hotkey_handlers.push(hotkey_handler);
			return hotkey;
		},
		select_concept: function (concept) {
			document.location = '#/concept/' + concept.CONCEPT_ID;
		},
		add_filter: function (member) {
			var filters = fe_search.GetCurrentFilter();
			member_index = fe_search.Facets[current_facet_index].Members.indexOf(member);
			filter = current_facet_index + '-' + member_index;
			filters.push(filter);
			fe_search.SetFilter(filters);
			current_facet_index++;
			page_model.total_pages = Math.ceil(fe_search.GetCurrentObjectCount() / page_model.page_length);

			page_model.reset_hotkeys();
			page_model.current_facet(fe_search.Facets[current_facet_index]);

			// only display if we are out of facets..
			if (current_facet_index == fe_search.Facets.length) {
				facet_hotkey_mode = false;
				concept_hotkey_mode = true;
				page_model.show_concept_page();
			}
		}
	};

	// keyboard hype
	$(document).keyup(function (e) {
		page_model.modifier_key_down = false;
	});

	$(document).keydown(function (e) {
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
				page_model.previous_page();
			} else if (e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 190) {
				// forward a page (down arrow, right arrow, period (aka >)
				page_model.next_page();
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
				$('#searchpanel').fadeOut(200);
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
				$('#searchpanel').slideDown(200);
				search(querystring);
			}
		}
	});

	$('#conceptpanel').on('click', function () {
		$('#searchpanel').fadeOut(200);
	});

	ko.applyBindings(page_model);
});

function toggle_filters() {
	$('#filter_control').toggleClass('selected');
	$('#filterpanel').toggle();
}

function link_renderer(s, p, d) {
	return '<a href=\"#/concept/' + d.CONCEPT_ID + '\">' + d.CONCEPT_NAME + '</a>';
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
	page_model.reset_hotkeys()
	page_model.current_page_concepts([]);
	page_model.current_page(0);

	$('#querytext').blur();

	// reset current facet index
	current_facet_index = 0;

	$.ajax({
		url: search_url + query,
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
			$('#searchpanel').scrollTop(0);
		},
		error: function (xhr, message) {
			$('#searchpanel_searching').hide();
			$('#searchpanel_error').html('An error occurred while attempting to run a search.  The most likely cause of this error is that the WebAPI layer was not available.');
			$('#searchpanel_error').show()
		}
	});
}

function load_concept(concept_id) {
	$('#welcomepanel').hide();

	$('#searchpanel').fadeOut();
	$('#tablepanel').hide();
	$('#conceptpanel').hide();
	$('#promptpanel').hide();

	concept_hotkey_mode = false;

	var concept_promise = $.getJSON(get_concept_url + concept_id, function (c) {
		page_model.current_concept(c);
		$('#conceptpanel').fadeIn();
	});

	var related_promise = $.getJSON(ohdsi_services_root + 'concept/' + concept_id + '/related', function (related) {
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
	$.when(related_promise, concept_promise).done(function () {
		$('.conceptpanel_concept_details').tooltip();
		var prompts = prompter.get_prompts(page_model.current_concept(), page_model.fe_related());
		page_model.prompts(prompts);
		$('#promptpanel').show();
	});
}
