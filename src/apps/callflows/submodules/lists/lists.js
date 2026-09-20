//////////////////////////////////////////////////
// Lists Submodule for Callflows
// @copyright 2024 RuhNet https://ruhnet.co
// @author Ruel Tmeizeh
//
// Derived from blacklist submodule.
// cb_lists Crossbar module must be loaded:
// sup crossbar_maintenance start_module cb_lists
//
//////////////////////////////////////////////////

define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	var app = {
		requests: {},

		subscribe: {
			'callflows.lists.edit': 'listsEdit',
			'callflows.fetchActions': 'listsDefineActions'
		},

		// Defines API requests not included in the SDK
		requests: {
			'lists.list': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists',
				'verb': 'GET'
			},
			'lists.get': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}',
				'verb': 'GET'
			},
			'lists.create': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists',
				'verb': 'PUT'
			},
			'lists.delete': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}',
				'verb': 'DELETE'
			},
			'lists.getEntries': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}/entries',
				'verb': 'GET'
			},
			'lists.addEntry': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}/entries',
				'verb': 'PUT'
			},
			'lists.updateEntry': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}/entries/{listEntryId}',
				'verb': 'PATCH'
			},
			'lists.deleteEntry': {
				'apiRoot': monster.config.api.default,
				'url': 'accounts/{accountId}/lists/{listId}/entries/{listEntryId}',
				'verb': 'DELETE'
			}
		},



		listsDefineActions: function(args) {
			var self = this,
				callflow_nodes = args.actions;

			$.extend(callflow_nodes, {
				'lists': {
					name: self.i18n.active().callflows.lists.title,
					module: 'lists',
					listEntities: function(callback) {

						monster.request({
							resource: "lists.list",
							data: {
								accountId: self.accountId,
							},
							success: function(res) {
								callback && callback(res.data);
							},
							error: function(res) {
								if (res.status == 404) {
									callback([]); //Populate results with nothing
								} else if (res.status == 401) {
									monster.util.logoutAndReload();
								} else {
									monster.ui.alert("ERROR: Failed to get lists: " + parsedError);
									callback([]); //Populate results with nothing
								}
							}
						});
					},
					editEntity: 'callflows.lists.edit'
				}
			});
		},

		// Added for the subscribed event to avoid refactoring conferenceEdit
		listsEdit: function(args) {
			//console.log(args);
			var self = this,
				afterGetData = function(data) {
					var template = $(self.getTemplate({
							name: 'edit',
							data: data,
							submodule: 'lists'
						})),
						listsForm = template.find('#lists-form'),
						$listNumbers = template.find('.saved-numbers');

					monster.ui.validate(listsForm, {
						rules: {
							'name': { required: true }
						}
					});

					_.each(data.entries, function(entry) {
						entry['state'] = 'saved';
						$listNumbers.append($(self.getTemplate({
							name: 'addNumber',
							data: entry,
							submodule: 'lists'
						})));
					});

					self.listsBindEvents(data, template, args.callbacks);

					(args.target)
						.empty()
						.append(template);
				};

			if (args.data.id) {
				self.listsGet(args.data.id, function(data) {
					afterGetData(data); //data = {id: listid, name: listname, entries: [entry1,entry2,...]}
				});
			} else {
				afterGetData({});
			}
		},

		listsBindEvents: function(data, template, callbacks) {
			var self = this,
				addNumber = function(e) {
					var number = template.find('#number_value').val();
					var list_id = template.find('#active-list').attr('data-listid');

					if (number) {
						var entryData = {
							number: number,
						};

						$('.list-numbers .saved-numbers', template)
							.prepend($(self.getTemplate({
								name: 'addNumber',
								data: {
									key: list_id ? list_id : null,
									id: null,
									state: 'pending-add',
									value: {
										number: number,
									},
								},
								submodule: 'lists'
							})));
						$('#number_value', template).val('');
					}
				};

			$('.number-wrapper.placeholder:not(.active)', template).click(function() {
				var $this = $(this);

				$this.addClass('active');

				$('#number_value', template).focus();
			});

			$('#add_number', template).click(function(e) {
				e.preventDefault();
				addNumber();
			});

			$('.add-number', template).bind('keypress', function(e) {
				var code = e.keyCode || e.which;

				if (code === 13) {
					addNumber(e);
				}
			});

			$(template).delegate('.delete-number', 'click', function(e) {
				if ($(this).parents('.number-wrapper').data('state') == 'pending-add') { //if this has just been added and not saved, remove it
					$(this).parents('.number-wrapper').remove();
				} else { //toggle background red to signify that it will be deleted when save is clicked
					if ($(this).parents('.number-wrapper').hasClass('pending-delete')) {
						$(this).parents('.number-wrapper').removeClass('pending-delete');
						$(this).parents('.number-wrapper').css('background-color','');
						$(this).parents('.number-wrapper').attr('data-state', 'saved');
					} else {
						$(this).parents('.number-wrapper').addClass('pending-delete');
						$(this).parents('.number-wrapper').attr('data-state', 'pending-delete');
						$(this).parents('.number-wrapper').css('background-color','#B91B0C');
					}
				}
			});

			$('#cancel_number', template).click(function(e) {
				e.stopPropagation();

				$('.number-wrapper.placeholder.active', template).removeClass('active');
				$('#number_value', template).val('');
			});

			$('.lists-save', template).click(function() {
				var formData = monster.ui.getFormData('blacklist-form'),
					cleanData = self.listsCleanFormData(formData),
					entries = [];

				$('.saved-numbers .number-wrapper', template).each(function(k, wrapper) {
					entry = {
						list_id: $(wrapper).attr('data-listid'),
						id: $(wrapper).attr('id'),
						number: $(wrapper).attr('data-number'),
						state: $(wrapper).attr('data-state'),
					}
					entries.push(entry);
				});

				cleanData.entries = entries;

				if (data.id) {
					cleanData.id = data.id;
				}

				self.listsSave(cleanData, callbacks.save_success);
			});

			$('.lists-delete', template).click(function() {
				monster.ui.confirm(self.i18n.active().callflows.lists.are_you_sure_you_want_to_delete, function() {
					self.listsDelete(data.id, callbacks.delete_success);
				});
			});
		},

		listsCleanFormData: function(data) {
			delete data.extra;

			return data;
		},

		listsSave: function(data, callback) {
			var self = this;

			if (data.id) {
				self.listsUpdate(data, callback);
			} else {
				var newListData = { name: data.name };
				self.listsCreate(newListData, function(createdListData) {
					data.id = createdListData.id;
					self.listsUpdate(data, callback);
				});
			}
		},

		listsList: function(callback) {
			var self = this;

			monster.request({
				resource: "lists.list",
				data: {
					accountId: self.accountId,
				},
				success: function(res) {
					callback && callback(res.data);
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]); //Populate results with nothing
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to get lists: " + parsedError);
						callback([]); //Populate results with nothing
					}
				}
			});
		},

		listsGet: function(id, callback) {
			var self = this;

			monster.request({
				resource: "lists.get",
				data: {
					accountId: self.accountId,
					listId: id,
				},
				success: function(data) {
					listprops = data.data;
					monster.request({
						resource: "lists.getEntries",
						data: {
							accountId: self.accountId,
							listId: id,
						},
						success: function(res) {
							var listdata = {
								id: listprops.id,
								name: listprops.name,
								entries: res.data
							};
							callback && callback(listdata);
						},
						error: function(res) {
							if (res.status == 404) {
								callback([]); //Populate results with nothing
							} else if (res.status == 401) {
								monster.util.logoutAndReload();
							} else {
								monster.ui.alert("ERROR: Failed to get list entries from list " + id + ": " + parsedError);
								callback([]); //Populate results with nothing
							}
						}
					});
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]); //Populate results with nothing
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to get list " + id + ": " + parsedError);
						callback([]); //Populate results with nothing
					}
				}
			});

		},

		listsCreate: function(data, callback) {
			var self = this;
			monster.request({
				resource: "lists.create",
				data: {
					accountId: self.accountId,
					data: data,
				},
				success: function(res) {
					callback && callback(res.data);
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]);
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to create list: " + parsedError);
						callback([]);
					}
				}
			});
		},

		listsAddEntry: function(data, callback) {
			var self = this;
			monster.request({
				resource: "lists.addEntry",
				data: {
					listId: data.list_id,
					accountId: self.accountId,
					data: {
						number: data.number,
					},
				},
				success: function(res) {
					callback && callback(res.data);
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]);
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to add number to list: " + parsedError);
						callback([]);
					}
				}
			});
		},

		listsUpdate: function(data, callback) {
			var self = this;
			var entrySaves = _.map(data.entries, function(entry) {
				if (!entry.list_id) entry.list_id = data.id;
				if (entry.state == 'pending-add') {
					self.listsAddEntry(entry, function(data) {
						//console.log("Added entry: ");
						console.log(data);
					});
					entry.state = 'saved';
				} else if ((entry.state == 'pending-delete') && entry.id) {
					self.listsDeleteEntry(entry, function(data) {
						//console.log("Deleted entry: ");
						console.log(data);
					});
					entry.state = 'deleted';
				}
				return entry;
			});
			console.log(entrySaves);
			callback(entrySaves);
		},

		listsDeleteEntry: function(data, callback) {
			var self = this;

			console.log("listsDeleteEntry input data:");
			console.log(data);

			monster.request({
				resource: "lists.deleteEntry",
				data: {
					accountId: self.accountId,
					listId: data.list_id,
					listEntryId: data.id,
				},
				success: function(res) {
					
					callback && callback(res.data);
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]);
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to add number to list: " + parsedError);
						callback([]);
					}
				}
			});
		},

		listsDelete: function(id, callback) {
			var self = this;

			monster.request({
				resource: "lists.delete",
				data: {
					accountId: self.accountId,
					listId: id,
				},
				success: function(res) {
					callback && callback(res.data);
				},
				error: function(res) {
					if (res.status == 404) {
						callback([]);
					} else if (res.status == 401) {
						monster.util.logoutAndReload();
					} else {
						monster.ui.alert("ERROR: Failed to add number to list: " + parsedError);
						callback([]);
					}
				}
			});
		}




	};

	return app;
});
