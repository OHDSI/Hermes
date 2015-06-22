var formatPercent = d3.format('.2%');
var formatFixed = d3.format('.2f');
var formatComma = d3.format(',');

function runReport() {
	pageModel.loadingReport(true);

	switch (pageModel.reportReportName()) {
	case 'Template':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/cohortspecific',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);
				console.log(data);
			}
		});
		break;
	case 'Condition':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/condition',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);

				console.log(data);
			}
		});
		break;
	case 'Drugs by Index':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/cohortspecifictreemap',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);

				var width = 1000;
				var height = 250;
				var minimum_area = 50;
				var threshold = minimum_area / (width * height);

				var table_data, datatable, tree, treemap;
				if (data.drugEraPrevalence) {
					var drugEraPrevalence = normalizeDataframe(normalizeArray(data.drugEraPrevalence, true));
					var drugEraPrevalenceData = drugEraPrevalence;

					if (!drugEraPrevalenceData.empty) {
						table_data = drugEraPrevalence.conceptPath.map(function (d, i) {
							var conceptDetails = this.conceptPath[i].split('||');
							return {
								concept_id: this.conceptId[i],
								atc1: conceptDetails[0],
								atc3: conceptDetails[1],
								atc5: conceptDetails[2],
								ingredient: conceptDetails[3],
								name: conceptDetails[3],
								num_persons: formatComma(this.numPersons[i]),
								percent_persons: formatPercent(this.percentPersons[i]),
								relative_risk: formatFixed(this.logRRAfterBefore[i]),
								percent_persons_before: formatPercent(this.percentPersons[i]),
								percent_persons_after: formatPercent(this.percentPersons[i]),
								risk_difference: formatFixed(this.riskDiffAfterBefore[i])
							};
						}, drugEraPrevalenceData);

						$(document).on('click', '.treemap_table tbody tr', function () {
							$('.treemap_table tbody tr.selected').removeClass('selected');
							$(this).addClass('selected');
							var datatable = datatables[$(this).parents('.treemap_table').attr('id')];
							var data = datatable.data()[datatable.row(this)[0]];
							if (data) {
								var did = data.concept_id;
								var concept_name = data.name;
								drilldown(did, concept_name, $(this).parents('.treemap_table').attr('type'));
							}
						});

						datatable = $('#drugera_table').DataTable({
							order: [5, 'desc'],
							dom: 'T<"clear">lfrtip',
							data: table_data,
							columns: [
								{
									data: 'concept_id'
                                },
								{
									data: 'atc1'
                                },
								{
									data: 'atc3',
									visible: false
                                },
								{
									data: 'atc5'
                                },
								{
									data: 'ingredient'
                                },
								{
									data: 'num_persons',
									className: 'numeric'
                                },
								{
									data: 'percent_persons',
									className: 'numeric'
                                },
								{
									data: 'relative_risk',
									className: 'numeric'
                                }
                            ],
							pageLength: 5,
							lengthChange: false,
							deferRender: true,
							destroy: true
						});
						datatables['drugera_table'] = datatable;

						tree = buildHierarchyFromJSON(drugEraPrevalence, threshold);
						treemap = new jnj_chart.treemap();
						treemap.render(tree, '#treemap_container', width, height, {
							onclick: function (node) {
								drilldown(node.id, node.name, 'drug');
							},
							getsizevalue: function (node) {
								return node.num_persons;
							},
							getcolorvalue: function (node) {
								return node.relative_risk;
							},
							getcolorrange: function () {
								return colorbrewer.RR[3];
							},
							getcolorscale: function () {
								return [-6, 0, 5];
							},
							getcontent: function (node) {
								var result = '',
									steps = node.path.split('||'),
									i = steps.length - 1;
								result += '<div class="pathleaf">' + steps[i] + '</div>';
								result += '<div class="pathleafstat">Prevalence: ' + formatPercent(node.pct_persons) + '</div>';
								result += '<div class="pathleafstat">% Persons Before: ' + formatPercent(node.pct_persons_before) + '</div>';
								result += '<div class="pathleafstat">% Persons After: ' + formatPercent(node.pct_persons_after) + '</div>';
								result += '<div class="pathleafstat">Number of People: ' + formatComma(node.num_persons) + '</div>';
								result += '<div class="pathleafstat">Log of Relative Risk per Person: ' + formatFixed(node.relative_risk) + '</div>';
								result += '<div class="pathleafstat">Difference in Risk: ' + formatFixed(node.risk_difference) + '</div>';
								return result;
							},
							gettitle: function (node) {
								var title = '',
									steps = node.path.split('||');
								for (i = 0; i < steps.length - 1; i++) {
									title += ' <div class="pathstep">' + Array(i + 1).join('&nbsp;&nbsp') + steps[i] + ' </div>';
								}
								return title;
							}
						});

						$('[data-toggle="popover"]').popover();
					}
				}
			}
		});
		break;
	case 'Conditions by Index':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/cohortspecifictreemap',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);

				var width = 1000;
				var height = 250;
				var minimum_area = 50;
				var threshold = minimum_area / (width * height);

				var table_data, datatable, tree, treemap;
				// condition prevalence
				if (data.conditionOccurrencePrevalence) {
					var normalizedData = normalizeDataframe(normalizeArray(data.conditionOccurrencePrevalence, true));
					var conditionOccurrencePrevalence = normalizedData;
					if (!conditionOccurrencePrevalence.empty) {
						table_data = normalizedData.conceptPath.map(function (d, i) {
							var conceptDetails = this.conceptPath[i].split('||');
							return {
								concept_id: this.conceptId[i],
								soc: conceptDetails[0],
								hlgt: conceptDetails[1],
								hlt: conceptDetails[2],
								pt: conceptDetails[3],
								snomed: conceptDetails[4],
								name: conceptDetails[4],
								num_persons: formatComma(this.numPersons[i]),
								percent_persons: formatPercent(this.percentPersons[i]),
								relative_risk: formatFixed(this.logRRAfterBefore[i]),
								percent_persons_before: formatPercent(this.percentPersons[i]),
								percent_persons_after: formatPercent(this.percentPersons[i]),
								risk_difference: formatFixed(this.riskDiffAfterBefore[i])
							};
						}, conditionOccurrencePrevalence);

						$(document).on('click', '.treemap_table tbody tr', function () {
							$('.treemap_table tbody tr.selected').removeClass('selected');
							$(this).addClass('selected');
							var datatable = datatables[$(this).parents('.treemap_table').attr('id')];
							var data = datatable.data()[datatable.row(this)[0]];
							if (data) {
								var did = data.concept_id;
								var concept_name = data.name;
								drilldown(did, concept_name, $(this).parents('.treemap_table').attr('type'));
							}
						});

						datatable = $('#condition_table').DataTable({
							order: [6, 'desc'],
							dom: 'T<"clear">lfrtip',
							data: table_data,
							columns: [{
									data: 'concept_id'
								},
								{
									data: 'soc'
                },
								{
									data: 'hlgt',
									visible: false
								},
								{
									data: 'hlt'
                },
								{
									data: 'pt',
									visible: false
                },
								{
									data: 'snomed'
                },
								{
									data: 'num_persons',
									className: 'numeric'
                },
								{
									data: 'percent_persons',
									className: 'numeric'
                },
								{
									data: 'relative_risk',
									className: 'numeric'
                }
                ],
							pageLength: 5,
							lengthChange: false,
							deferRender: true,
							destroy: true
						});
						datatables['condition_table'] = datatable;

						tree = buildHierarchyFromJSON(conditionOccurrencePrevalence, threshold);
						treemap = new jnj_chart.treemap();
						treemap.render(tree, '#treemap_container', width, height, {
							onclick: function (node) {
								drilldown(node.id, node.name, 'condition');
							},
							getsizevalue: function (node) {
								return node.num_persons;
							},
							getcolorvalue: function (node) {
								return node.relative_risk;
							},
							getcolorrange: function () {
								return colorbrewer.RR[3];
							},
							getcolorscale: function () {
								return [-6, 0, 5];
							},
							getcontent: function (node) {
								var result = '',
									steps = node.path.split('||'),
									i = steps.length - 1;
								result += '<div class="pathleaf">' + steps[i] + '</div>';
								result += '<div class="pathleafstat">Prevalence: ' + formatPercent(node.pct_persons) + '</div>';
								result += '<div class="pathleafstat">% Persons Before: ' + formatPercent(node.pct_persons_before) + '</div>';
								result += '<div class="pathleafstat">% Persons After: ' + formatPercent(node.pct_persons_after) + '</div>';
								result += '<div class="pathleafstat">Number of People: ' + formatComma(node.num_persons) + '</div>';
								result += '<div class="pathleafstat">Log of Relative Risk per Person: ' + formatFixed(node.relative_risk) + '</div>';
								result += '<div class="pathleafstat">Difference in Risk: ' + formatFixed(node.risk_difference) + '</div>';
								return result;
							},
							gettitle: function (node) {
								var title = '',
									steps = node.path.split('||');
								for (i = 0; i < steps.length - 1; i++) {
									title += ' <div class="pathstep">' + Array(i + 1).join('&nbsp;&nbsp') + steps[i] + ' </div>';
								}
								return title;
							}
						});

						$('[data-toggle="popover"]').popover();
					}
				}
			}
		});
		break;
	case 'Cohort Specific':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/cohortspecific',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);

				// Persons By Duration From Start To End
				var result = normalizeArray(data.personsByDurationFromStartToEnd, false);
				if (!result.empty) {
					var personsByDurationData = normalizeDataframe(result).duration
						.map(function (d, i) {
							var item = {
								xValue: this.duration[i],
								yValue: this.pctPersons[i]
							};
							return item;
						}, result);

					var personsByDurationSingle = new jnj_chart.line();
					personsByDurationSingle.render(personsByDurationData, "#personsByDurationFromStartToEnd", 460, 250, {
						yFormat: d3.format('0%'),
						xLabel: 'Day',
						yLabel: 'Percent of Population',
						labelIndexDate: true,
						colorBasedOnIndex: true
					});
				}

				// prevalence by month
				var byMonthData = normalizeArray(data.prevalenceByMonth, true);
				if (!byMonthData.empty) {
					var byMonthSeries = mapMonthYearDataToSeries(byMonthData, {

						dateField: 'xCalendarMonth',
						yValue: 'yPrevalence1000Pp',
						yPercent: 'yPrevalence1000Pp'
					});

					var prevalenceByMonth = new jnj_chart.line();
					prevalenceByMonth.render(byMonthSeries, "#prevalenceByMonth", 460, 150, {
						xScale: d3.time.scale().domain(d3.extent(byMonthSeries[0].values, function (d) {
							return d.xValue;
						})),
						xFormat: d3.time.format("%m/%Y"),
						tickFormat: d3.time.format("%Y"),
						xLabel: "Date",
						yLabel: "Prevalence per 1000 People"
					});
				}

				// age at index
				var ageAtIndexDistribution = normalizeArray(data.ageAtIndexDistribution);
				if (!ageAtIndexDistribution.empty) {
					var boxplot = new jnj_chart.boxplot();
					var agData = ageAtIndexDistribution.category
						.map(function (d, i) {
							var item = {
								Category: ageAtIndexDistribution.category[i],
								min: ageAtIndexDistribution.minValue[i],
								LIF: ageAtIndexDistribution.p10Value[i],
								q1: ageAtIndexDistribution.p25Value[i],
								median: ageAtIndexDistribution.medianValue[i],
								q3: ageAtIndexDistribution.p75Value[i],
								UIF: ageAtIndexDistribution.p90Value[i],
								max: ageAtIndexDistribution.maxValue[i]
							};
							return item;
						}, ageAtIndexDistribution);
					boxplot.render(agData, "#ageAtIndex", 235, 210, {
						xLabel: "Gender",
						yLabel: "Age"
					});
				}

				// distributionAgeCohortStartByCohortStartYear
				var distributionAgeCohortStartByCohortStartYear = normalizeArray(data.distributionAgeCohortStartByCohortStartYear);
				if (!distributionAgeCohortStartByCohortStartYear.empty) {
					var boxplotCsy = new jnj_chart.boxplot();
					var csyData = distributionAgeCohortStartByCohortStartYear.category
						.map(function (d, i) {
							var item = {
								Category: this.category[i],
								min: this.minValue[i],
								LIF: this.p10Value[i],
								q1: this.p25Value[i],
								median: this.medianValue[i],
								q3: this.p75Value[i],
								UIF: this.p90Value[i],
								max: this.maxValue[i]
							};
							return item;
						}, distributionAgeCohortStartByCohortStartYear);
					boxplotCsy.render(csyData, "#distributionAgeCohortStartByCohortStartYear", 235, 210, {
						xLabel: "Cohort Start Year",
						yLabel: "Age"
					});
				}

				// distributionAgeCohortStartByGender
				var distributionAgeCohortStartByGender = normalizeArray(data.distributionAgeCohortStartByGender);
				if (!distributionAgeCohortStartByGender.empty) {
					var boxplotBg = new jnj_chart.boxplot();
					var bgData = distributionAgeCohortStartByGender.category
						.map(function (d, i) {
							var item = {
								Category: this.category[i],
								min: this.minValue[i],
								LIF: this.p10Value[i],
								q1: this.p25Value[i],
								median: this.medianValue[i],
								q3: this.p75Value[i],
								UIF: this.p90Value[i],
								max: this.maxValue[i]
							};
							return item;
						}, distributionAgeCohortStartByGender);
					boxplotBg.render(bgData, "#distributionAgeCohortStartByGender", 235, 210, {
						xLabel: "Gender",
						yLabel: "Age"
					});
				}

				// persons in cohort from start to end
				var personsInCohortFromCohortStartToEnd = normalizeArray(data.personsInCohortFromCohortStartToEnd);
				if (!personsInCohortFromCohortStartToEnd.empty) {
					var personsInCohortFromCohortStartToEndSeries = map30DayDataToSeries(personsInCohortFromCohortStartToEnd, {
						dateField: 'monthYear',
						yValue: 'countValue',
						yPercent: 'percentValue'
					});
					var observationByMonthSingle = new jnj_chart.line();
					observationByMonthSingle.render(personsInCohortFromCohortStartToEndSeries, "#personinCohortFromStartToEnd", 460, 250, {
						xScale: d3.time.scale().domain(d3.extent(personsInCohortFromCohortStartToEndSeries[0].values, function (d) {
							return d.xValue;
						})),
						xLabel: "30 Day Increments",
						yLabel: "People"
					});
				}

				// render trellis
				var trellisData = normalizeArray(data.numPersonsByCohortStartByGenderByAge, true);

				console.log(trellisData);

				if (!trellisData.empty) {
					var allDeciles = ["0-9", "10-19", "20-29", "30-39", "40-49", "50-59", "60-69", "70-79", "80-89", "90-99"];
					var minYear = d3.min(trellisData.xCalendarYear),
						maxYear = d3.max(trellisData.xCalendarYear);

					var seriesInitializer = function (tName, sName, x, y) {
						return {
							trellisName: tName,
							seriesName: sName,
							xCalendarYear: x,
							yPrevalence1000Pp: y
						};
					};

					var nestByDecile = d3.nest()
						.key(function (d) {
							return d.trellisName;
						})
						.key(function (d) {
							return d.seriesName;
						})
						.sortValues(function (a, b) {
							return a.xCalendarYear - b.xCalendarYear;
						});

					// map data into chartable form
					var normalizedSeries = trellisData.trellisName.map(function (d, i) {
						var item = {};
						var container = this;
						d3.keys(container).forEach(function (p) {
							item[p] = container[p][i];
						});
						return item;
					}, trellisData);

					var dataByDecile = nestByDecile.entries(normalizedSeries);
					// fill in gaps
					var yearRange = d3.range(minYear, maxYear, 1);

					dataByDecile.forEach(function (trellis) {
						trellis.values.forEach(function (series) {
							series.values = yearRange.map(function (year) {
								var yearData = series.values.filter(function (f) {
									return f.xCalendarYear === year;
								})[0] || seriesInitializer(trellis.key, series.key, year, 0);
								yearData.date = new Date(year, 0, 1);
								return yearData;
							});
						});
					});

					// create svg with range bands based on the trellis names
					var chart = new jnj_chart.trellisline();
					chart.render(dataByDecile, "#trellisLinePlot", 460, 250, {
						trellisSet: allDeciles,
						trellisLabel: "Age Decile",
						seriesLabel: "Year",
						yLabel: "Prevalence Per 1000 People",
						xFormat: d3.time.format("%Y"),
						yFormat: d3.format("0.2f"),
						tickPadding: 20,
						colors: d3.scale.ordinal()
							.domain(["MALE", "FEMALE", "UNKNOWN"])
							.range(["#1F78B4", "#FB9A99", "#33A02C"])

					});
				}
				pageModel.loadingReport(false);
			}
		});
		break;
	case 'Person':
		$.ajax({
			url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/person',
			success: function (data) {
				pageModel.currentReport(pageModel.reportReportName());
				pageModel.loadingReport(false);

				if (data.yearOfBirth.length > 0 && data.yearOfBirthStats.length > 0) {
					var yearHistogram = new jnj_chart.histogram();
					var histData = {};
					histData.intervalSize = 1;
					histData.min = data.yearOfBirthStats[0].minValue;
					histData.max = data.yearOfBirthStats[0].maxValue;
					histData.intervals = 100;
					histData.data = (normalizeArray(data.yearOfBirth));
					yearHistogram.render(mapHistogram(histData), "#reportPerson #hist", 460, 195, {
						xFormat: d3.format('d'),
						xLabel: 'Year',
						yLabel: 'People'
					});
				}

				var genderDonut = new jnj_chart.donut();
				genderDonut.render(mapConceptData(data.gender), "#reportPerson #gender", 260, 130, {
					colors: d3.scale.ordinal()
						.domain([8507, 8551, 8532])
						.range(["#1F78B4", "#33A02C", "#FB9A99"]),
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					}

				});

				var raceDonut = new jnj_chart.donut();
				raceDonut.render(mapConceptData(data.race), "#reportPerson #race", 260, 130, {
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					},
					colors: d3.scale.ordinal()
						.domain(data.race)
						.range(colorbrewer.Paired[10])
				});

				var ethnicityDonut = new jnj_chart.donut();
				ethnicityDonut.render(mapConceptData(data.ethnicity), "#reportPerson #ethnicity", 260, 130, {
					margin: {
						top: 5,
						bottom: 10,
						right: 150,
						left: 10
					},
					colors: d3.scale.ordinal()
						.domain(data.ethnicity)
						.range(colorbrewer.Paired[10])
				});
				pageModel.loadingReport(false);
			}
		});
		break; // person report
	}
}

// drilldown functions
function drilldown(id, name, type) {
	pageModel.loadingReportDrilldown(true);
	pageModel.activeReportDrilldown(false);

	$.ajax({
		type: "GET",
		url: pageModel.services()[0].url + pageModel.reportSourceKey() + '/cohortresults/' + pageModel.reportCohortDefinitionId() + '/cohortspecific' + type + "/" + id,
		contentType: "application/json; charset=utf-8"
	}).done(function (result) {
		if (result && result.length > 0) {
			$("#" + type + "DrilldownScatterplot").empty();
			var normalized = dataframeToArray(normalizeArray(result));

			// nest dataframe data into key->values pair
			var totalRecordsData = d3.nest()
				.key(function (d) {
					return d.recordType;
				})
				.entries(normalized)
				.map(function (d) {
					return {
						name: d.key,
						values: d.values
					};
				});

			var scatter = new jnj_chart.scatterplot();
			pageModel.activeReportDrilldown(true);
			$('#' + type + 'DrilldownScatterplotHeading').html(name);

			scatter.render(totalRecordsData, "#" + type + "DrilldownScatterplot", 460, 150, {
				yFormat: d3.format('0.2%'),
				xValue: "duration",
				yValue: "pctPersons",
				xLabel: "Duration Relative to Index",
				yLabel: "% Persons",
				seriesName: "recordType",
				showLegend: true,
				colors: d3.scale.category10(),
				tooltips: [
					{
						label: 'Series',
						accessor: function (o) {
							return o.recordType;
						}
					},
					{
						label: 'Percent Persons',
						accessor: function (o) {
							return d3.format('0.2%')(o.pctPersons);
						}
					},
					{
						label: 'Duration Relative to Index',
						accessor: function (o) {
							return o.duration;
						}
					},
					{
						label: 'Person Count',
						accessor: function (o) {
							return o.countValue;
						}
					}
				]
			});
			pageModel.loadingReportDrilldown(false);
		}
	});
}

// common functions

function buildHierarchyFromJSON(data, threshold) {
	var total = 0;

	var root = {
		"name": "root",
		"children": []
	};

	for (i = 0; i < data.percentPersons.length; i++) {
		total += data.percentPersons[i];
	}

	for (var i = 0; i < data.conceptPath.length; i++) {
		var parts = data.conceptPath[i].split("||");
		var currentNode = root;
		for (var j = 0; j < parts.length; j++) {
			var children = currentNode.children;
			var nodeName = parts[j];
			var childNode;
			if (j + 1 < parts.length) {
				// Not yet at the end of the path; move down the tree.
				var foundChild = false;
				for (var k = 0; k < children.length; k++) {
					if (children[k].name === nodeName) {
						childNode = children[k];
						foundChild = true;
						break;
					}
				}
				// If we don't already have a child node for this branch, create it.
				if (!foundChild) {
					childNode = {
						"name": nodeName,
						"children": []
					};
					children.push(childNode);
				}
				currentNode = childNode;
			} else {
				// Reached the end of the path; create a leaf node.
				childNode = {
					"name": nodeName,
					"num_persons": data.numPersons[i],
					"id": data.conceptId[i],
					"path": data.conceptPath[i],
					"pct_persons": data.percentPersons[i],
					"records_per_person": data.recordsPerPerson[i],
					"relative_risk": data.logRRAfterBefore[i],
					"pct_persons_after": data.percentPersonsAfter[i],
					"pct_persons_before": data.percentPersonsBefore[i],
					"risk_difference": data.riskDiffAfterBefore[i]
				};

				if ((data.percentPersons[i] / total) > threshold) {
					children.push(childNode);
				}
			}
		}
	}
	return root;
}

function mapConceptData(data) {
	var result;

	if (data instanceof Array) {
		result = [];
		$.each(data, function () {
			var datum = {}
			datum.id = (+this.conceptId || this.conceptName);
			datum.label = this.conceptName;
			datum.value = +this.countValue;
			result.push(datum);
		});
	} else if (data.countValue instanceof Array) // multiple rows, each value of each column is in the indexed properties.
	{
		result = data.countValue.map(function (d, i) {
			var datum = {}
			datum.id = (this.conceptId || this.conceptName)[i];
			datum.label = this.conceptName[i];
			datum.value = this.countValue[i];
			return datum;
		}, data);


	} else // the dataset is a single value result, so the properties are not arrays.
	{
		result = [
			{
				id: data.conceptId,
				label: data.conceptName,
				value: data.countValue
			}];
	}

	result = result.sort(function (a, b) {
		return b.label < a.label ? 1 : -1;
	});

	return result;
}

function mapHistogram(histogramData) {
	// result is an array of arrays, each element in the array is another array containing information about each bar of the histogram.
	var result = new Array();
	if (!histogramData.data || histogramData.data.empty) {
		return result;
	}
	var minValue = histogramData.min;
	var intervalSize = histogramData.intervalSize;

	for (var i = 0; i <= histogramData.intervals; i++) {
		var target = new Object();
		target.x = minValue + 1.0 * i * intervalSize;
		target.dx = intervalSize;
		target.y = histogramData.data.countValue[histogramData.data.intervalIndex.indexOf(i)] || 0;
		result.push(target);
	};

	return result;
}

function map30DayDataToSeries(data, options) {
	var defaults = {
		dateField: "x",
		yValue: "y",
		yPercent: "p"
	};

	var options = $.extend({}, defaults, options);

	var series = {};
	series.name = "All Time";
	series.values = [];
	if (data && !data.empty) {
		for (var i = 0; i < data[options.dateField].length; i++) {
			series.values.push({
				xValue: data[options.dateField][i],
				yValue: data[options.yValue][i],
				yPercent: data[options.yPercent][i]
			});
		}
		series.values.sort(function (a, b) {
			return a.xValue - b.xValue;
		});
	}
	return [series]; // return series wrapped in an array
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
	if (data && !data.empty) {
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
	}
	return [series]; // return series wrapped in an array
}

function mapMonthYearDataToSeriesByYear(data, options) {
	// map data in the format yyyymm into a series for each year, and a value for each month index (1-12)
	var defaults = {
		dateField: "x",
		yValue: "y",
		yPercent: "p"
	};

	var options = $.extend({}, defaults, options);

	// this function takes month/year histogram data from Achilles and converts it into a multi-series line plot
	var series = [];
	var seriesMap = {};

	for (var i = 0; i < data[options.dateField].length; i++) {
		var targetSeries = seriesMap[Math.floor(data[options.dateField][i] / 100)];
		if (!targetSeries) {
			targetSeries = {
				name: (Math.floor(data[options.dateField][i] / 100)),
				values: []
			};
			seriesMap[targetSeries.name] = targetSeries;
			series.push(targetSeries);
		}
		targetSeries.values.push({
			xValue: data[options.dateField][i] % 100,
			yValue: data[options.yValue][i],
			yPercent: data[options.yPercent][i]
		});
	}
	series.forEach(function (d) {
		d.values.sort(function (a, b) {
			return a.xValue - b.xValue;
		});
	});
	return series;
}

function dataframeToArray(dataframe) {
	// dataframes from R serialize into an obect where each column is an array of values.
	var keys = d3.keys(dataframe);
	var result;
	if (dataframe[keys[0]] instanceof Array) {
		result = dataframe[keys[0]].map(function (d, i) {
			var item = {};
			var container = this;
			keys.forEach(function (p) {
				item[p] = container[p][i];
			});
			return item;
		}, dataframe);
	} else {
		result = [dataframe];
	}
	return result;
}

function normalizeDataframe(dataframe) {
	// rjson serializes dataframes with 1 row as single element properties.  This function ensures fields are always arrays.
	var keys = d3.keys(dataframe);
	keys.forEach(function (key) {
		if (!(dataframe[key] instanceof Array)) {
			dataframe[key] = [dataframe[key]];
		}
	});
	return dataframe;
}

function normalizeArray(ary, numerify) {
	var obj = {};
	var keys;

	if (ary && ary.length > 0 && ary instanceof Array) {
		keys = d3.keys(ary[0]);

		$.each(keys, function () {
			obj[this] = [];
		});

		$.each(ary, function () {
			var thisAryObj = this;
			$.each(keys, function () {
				var val = thisAryObj[this];
				if (numerify) {
					if (_.isFinite(+val)) {
						val = (+val);
					}
				}
				obj[this].push(val);
			});
		});
	} else {
		obj.empty = true;
	}

	return obj;
}
