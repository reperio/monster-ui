define(function(require) {
	var $ = require('jquery'),
		monster = require('monster');

	var app = {
		requests: {
			'callflows.destination_listmatch.lists.get': {
				'verb': 'GET',
				'url': 'accounts/{accountId}/lists'
			}
		},

		subscribe: {
			'callflows.fetchActions': 'destination_listmatchDefineActions'
		},

		destination_listmatchDefineActions: function(args) {
			var self = this,
				callflow_nodes = args.actions,
				i18n = self.i18n.active().callflows.destination_list_match;

			$.extend(callflow_nodes, {
				'destination_listmatch[id=*]': {
					name: i18n.destination_list_match,
					icon: 'group',
					category: self.i18n.active().oldCallflows.advanced_cat,
					module: 'destination_listmatch',
					tip: i18n.tooltip,
					data: {},
					rules: [
						{
							type: 'quantity',
							maxSize: '2'
						}
					],
					isUsable: 'true',
					weight: 48,
					caption: function(node, caption_map) {
						return '';
					},
					edit: function(node, callback) {
						self.destination_listmatchShowEditDialog(node, callback);
					},
					key_caption: function(child_node, caption_map) {
						if(child_node.key === 'match') {
							return i18n.menu_option_dialog.match;
						} else if(child_node.key === 'nomatch') {
							return i18n.menu_option_dialog.no_match;
						}
						return child_node.key;
					},
					key_edit: function(child_node, callback) {
						var $dialog, $popup;

						$popup = $(self.getTemplate({
							name: 'dialogMenuOption',
							data: {
								selected: child_node.key
							},
							submodule: 'destination_listmatch'
						}));

						$popup.find('.js-save').on('click', function() {
							var $menuOption = $('#destination-list-match_menu-option option:selected', $popup);
							child_node.key = $menuOption.val();
							child_node.key_caption = $menuOption.text();
							$dialog.dialog('close');
						});

						$dialog = monster.ui.dialog($popup, {
							title: self.i18n.active().callflows.destination_list_match.menu_option_dialog.title,
							minHeight: '0',
							width: 450,
							beforeClose: function() {
								if (typeof callback === 'function') {
									callback();
								}
							}
						});
					}
				}
			});
		},

		destination_listmatchShowEditDialog: function (node, callback) {
			var self = this,
				$popup,
				$dialog,
				listId = node.getMetadata('id');

			self.destination_listmatchGetLists(function (lists) {
				$dialog = $(self.getTemplate({
					name: 'dialogEdit',
					data: {
						listId: listId,
						lists: lists
					},
					submodule: 'destination_listmatch'
				}));

				$popup = monster.ui.dialog($dialog, {
					title: self.i18n.active().callflows.destination_list_match.edit_dialog.title,
					minHeight: '0',
					width: 450,
					beforeClose: function() {
						if (typeof callback === 'function') {
							callback();
						}
					}
				});

				$dialog.find('.js-save').click(function() {
					var $selectedOption = $('#destination-list-match_id option:selected');
					var listId = $selectedOption.val();

					node.setMetadata('id', listId);
					if (typeof callback === 'function') {
						callback();
					}

					$popup.dialog('close');
				});
			})
		},

		destination_listmatchGetLists: function(callback){
			var self = this;

			monster.request({
				resource: 'callflows.destination_listmatch.lists.get',
				data: {
					accountId: self.accountId,
					generateError: false
				},
				success: function (data) {
					if(typeof(callback) === 'function') {
						callback(data.data);
					}
				}
			});
		},
	};

	return app;
});
