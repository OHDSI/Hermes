	(function ($) {
		ko.bindingHandlers.lineChart = {
			init: function (element, valueAccessor) {
				var binding = ko.utils.unwrapObservable(valueAccessor());
			},
			update: function (element, valueAccessor) {
				var binding = ko.utils.unwrapObservable(valueAccessor());

				d3.select(element).selectAll('svg').remove();

				var prevalenceByMonth = new jnj_chart.line();
				prevalenceByMonth.render(binding, element, 1000, 200, {
					xScale: d3.time.scale().domain(d3.extent(binding[0].values, function (d) {
						return d.xValue;
					})),
					xFormat: d3.time.format("%m/%Y"),
					tickFormat: d3.time.format("%Y"),
					xLabel: "Date",
					yLabel: "Prevalence per 1000 People"
				});

			}
		};
	})(jQuery);
