		(function ($) {
			ko.bindingHandlers.dataTable = {
				init: function (element, valueAccessor) {
					var binding = ko.utils.unwrapObservable(valueAccessor());

					// If the binding is an object with an options field,
					// initialise the dataTable with those options.
					if (binding.options) {
						$(element).dataTable(binding.options);
					}
				},
				update: function (element, valueAccessor) {
					var binding = ko.utils.unwrapObservable(valueAccessor());

					// If the binding isn't an object, turn it into one.
					if (!binding.data) {
						binding = {
							data: valueAccessor()
						}
					}

					// Clear table
					$(element).dataTable().fnClearTable();

					// Rebuild table from data source specified in binding
					if (binding.data.length > 0)
						$(element).dataTable().fnAddData(binding.data);
				}
			};
		})(jQuery);
