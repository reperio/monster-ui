define(function(require) {
	var $ = require('jquery'),
		_ = require('lodash'),
		monster = require('monster');

	// Global and local resources are the same editor over two Crossbar endpoints: the same
	// document, the same form, the same validation, differing only in where it is stored and
	// who may reach it. Everything below is written once and parameterized by scope.
	var scopes = {
		global: {
			module: 'globalresource',
			resourceType: 'global_resource',
			sdk: 'globalResources',
			i18nKey: 'globalresource',
			editTopic: 'callflows.globalresource.edit'
		},
		local: {
			module: 'localresource',
			resourceType: 'local_resource',
			sdk: 'localResources',
			i18nKey: 'localresource',
			editTopic: 'callflows.localresource.edit'
		}
	};

	var app = {
		requests: {},

		subscribe: {
			'callflows.fetchActions': 'resourceDefineActions',
			'callflows.globalresource.edit': '_globalResourceEdit',
			'callflows.localresource.edit': '_localResourceEdit'
		},

		// Added for the subscribed events to avoid refactoring resourceEdit
		_globalResourceEdit: function(args) {
			var self = this;
			self.resourceEdit(scopes.global, args.data, args.parent, args.target, args.callbacks, args.data_defaults);
		},

		_localResourceEdit: function(args) {
			var self = this;
			self.resourceEdit(scopes.local, args.data, args.parent, args.target, args.callbacks, args.data_defaults);
		},

		resourceEdit: function(scope, data, _parent, _target, _callbacks, data_defaults) {
			var self = this,
				parent = _parent || $('#resource-content'),
				target = _target || $('#resource-view', parent),
				_callbacks = _callbacks || {},
				callbacks = {
					save_success: _callbacks.save_success,
					save_error: _callbacks.save_error,
					delete_success: _callbacks.delete_success,
					delete_error: _callbacks.delete_error,
					after_render: _callbacks.after_render
				},
				defaults = {
					data: $.extend(true, {
						weight_cost: 50,
						enabled: true,
						gateways: [
							{
								codecs: ['PCMU', 'PCMA'],
								progress_timeout: '6',
								port: "5060"
							}
						],
						rules: [
							'^.*$'
						],
						caller_id_options: {
							type: 'external'
						},
						flags: [],
						caller_id: {
							external: {},
							internal: {},
							emergency: {}
						},
						media: {
							audio: {
								codecs: ['PCMU', 'PCMA']
							},
							video: {
								codecs: []
							}
						}
					}, data_defaults || {}),

					field_data: {
						users: [],
						call_restriction: {},
						caller_id_options: {
							type: {
								'external': 'external',
								'internal': 'internal',
								'emergency': 'emergency'
							}
						},
						media: {
							audio: {
								codecs: {
									'OPUS': 'OPUS',
									'G722_32': 'G722.1 @ 32khz',
									'G722_16': 'G722.1 @ 16khz',
									'Speex': 'Speex @ 16khz',
									'PCMU': 'G711u / PCMU - 64kbps',
									'PCMA': 'G711a / PCMA - 64kbps',
									'G729': 'G729 - 8kbps (Requires License)',
									'GSM': 'GSM',
									'CELT_48': 'Siren (HD) @ 48kHz',
									'CELT_64': 'Siren (HD) @ 64kHz'
								}
							},
							video: {
								codecs: {
									'VP8': 'VP8',
									'H264': 'H264',
									'H263': 'H263',
									'H261': 'H261'
								}
							}
						},
						hide_owner: data.hide_owner || false,
						outbound_flags: data.outbound_flags ? data.outbound_flags.join(', ') : data.outbound_flags
					},
					functions: {
						inArray: function(value, array) {
							if (array) {
								return ($.inArray(value, array) === -1) ? false : true;
							} else {
								return false;
							}
						}
					}
				},
				parallelRequests = function(resourceData) {
					monster.parallel({
						provisionerData: function(callback) {
							callback(null, {});
						}
					},
					function(err, results) {
						var render_data = self.resourcePrepareDataForTemplate(data, defaults, $.extend(true, results, {
							get_resource: resourceData
						}));

						self.resourceRender(scope, render_data, target, callbacks);

						if (typeof callbacks.after_render === 'function') {
							callbacks.after_render();
						}
					});
				};

			if (typeof data === 'object' && data.id) {
				self.resourceGet(scope, data.id, function(_data, status) {
					defaults.data.resource_type = scope.resourceType;

					parallelRequests(_data);
				});
			} else {
				parallelRequests(defaults);
			}
		},

		resourcePrepareDataForTemplate: function(data, dataDefaults, results) {
			var self = this,
				dataResource = results.get_resource,
				dataProvisioner = results.provisionerData;

			if (typeof data === 'object' && data.id) {
				dataDefaults = $.extend(true, dataDefaults, { data: dataResource });
			}

			if (dataResource.hasOwnProperty('media') && dataResource.media.hasOwnProperty('audio')) {
				// If the codecs property is defined, override the defaults with it. Indeed, when an empty array is set as the
				// list of codecs, it gets overwritten by the extend function otherwise.
				if (dataResource.media.audio.hasOwnProperty('codecs')) {
					dataDefaults.data.media.audio.codecs = dataResource.media.audio.codecs;
				}
			}

			dataDefaults.field_data.provisioner = dataProvisioner;
			dataDefaults.field_data.provisioner.isEnabled = !_.isEmpty(dataProvisioner);

			dataDefaults.extra = dataDefaults.extra || {};
			dataDefaults.extra.isShoutcast = false;

			return dataDefaults;
		},

		resourceGetValidationByResourceType: function(resourceType) {
			var self = this,
				i18n = self.i18n.active(),
				validation = {},
				resourceTypeValidation = {
					rules: validation[resourceType]
				};

			if (_.includes(['global_resource', 'local_resource'], resourceType)) {
				_.merge(resourceTypeValidation, {
					rules: {
						'#name':                   { regex: /^.+$/ },
						'#weight_cost':            { regex: /^[0-9]+$/ },
						'#rules':                  { regex: /^.*$/ },
						'#caller_id_options_type': { regex: /^\w*$/ },
						'#gateways_username':      { regex: /^.*$/ },
						'#gateways_password':      { regex: /^[^\s]*$/ },
						'#gateways_prefix':        { regex: /^[\+]?[\#0-9]*$/ },
						'#gateways_suffix':        { regex: /^[0-9]*$/ },
						'#gateways_progress_timeout': { regex: /^[0-9]*$/ }
					},
					messages: {
						'#name': { regex: i18n.resources.validation.name },
						'#weight_cost': { regex: i18n.resources.validation.weight_cost },
						'#rules': { regex: i18n.resources.validation.rules },
						'#caller_id_options_type': { regex: i18n.resources.validation.caller_id_options_type },
						'#gateways_username': { regex: i18n.resources.validation.gateways.username },
						'#gateways_password': { regex: i18n.resources.validation.gateways.password },
						'#gateways_prefix': { regex: i18n.resources.validation.gateways.prefix },
						'#gateways_suffix': { regex: i18n.resources.validation.gateways.suffix },
						'#gateways_progress_timeout': { regex: i18n.resources.validation.gateways.progress_timeout },
					}
				});
			}

			return resourceTypeValidation;
		},

		resourceRender: function(scope, data, target, callbacks) {
			var self = this,
				resource_html;

			if (typeof data.data === 'object' && data.data.resource_type) {
				resource_html = $(self.getTemplate({
					name: 'resource',
					data: _.merge({
						showPAssertedIdentity: monster.config.whitelabel.showPAssertedIdentity
					}, data),
					submodule: 'resourcemanager'
				}));

				var resourceForm = resource_html.find('#resource-form');

				/* Do resource type specific things here */
				if ($.inArray(data.data.resource_type, ['global_resource', 'local_resource']) > -1) {
					monster.ui.protectField(resource_html.find('#gateways_password'), resource_html);
				}

				monster.ui.validate(resourceForm, self.resourceGetValidationByResourceType(data.data.resource_type));

				if (!$('#owner_id', resource_html).val()) {
					$('#edit_link', resource_html).hide();
				}

				resource_html.find('input[data-mask]').each(function() {
					var $this = $(this);
					monster.ui.mask($this, $this.data('mask'));
				});

				$('#ip_block', resource_html).hide();

			} else {
				resource_html = $(self.getTemplate({
					name: 'general_edit',
					submodule: 'resourcemanager'
				}));

				$('.media_pane', resource_html).show();
			}

			$('*[rel=popover]:not([type="text"])', resource_html).popover({
				trigger: 'hover'
			});

			$('*[rel=popover][type="text"]', resource_html).popover({
				trigger: 'focus'
			});

			self.winkstartTabs(resource_html);

			self.resourceBindEvents({
				scope: scope,
				data: data,
				template: resource_html,
				callbacks: callbacks
			});

			(target)
				.empty()
				.append(resource_html);

			$('.media_tabs .buttons[resource_type="' + scope.resourceType + '"]', resource_html).trigger('click');
		},

		/**
		 * Bind events for the resource edit template
		 * @param  {Object} args
		 * @param  {Object} args.data
		 * @param  {Object} args.template
		 * @param  {Object} args.callbacks
		 * @param  {Function} args.callbacks.save_success
		 * @param  {Function} args.callbacks.delete_success
		 */
		resourceBindEvents: function(args) {
			var self = this,
				scope = args.scope,
				data = args.data,
				callbacks = args.callbacks,
				resource_html = args.template;

			if (typeof data.data === 'object' && data.data.resource_type) {
				var resourceForm = resource_html.find('#resource-form');
				$('#owner_id', resource_html).change(function() {
					!$('#owner_id option:selected', resource_html).val() ? $('#edit_link', resource_html).hide() : $('#edit_link', resource_html).show();
				});

				$('.inline_action', resource_html).click(function(ev) {
					var _data = ($(this).data('action') === 'edit') ? { id: $('#owner_id', resource_html).val() } : {},
						_id = _data.id;

					ev.preventDefault();

					monster.pub('callflows.user.popupEdit', {
						data: _data,
						callback: function(user) {
							/* Create */
							if (!_id) {
								$('#owner_id', resource_html).append('<option id="' + user.id + '" value="' + user.id + '">' + user.first_name + ' ' + user.last_name + '</option>');
								$('#owner_id', resource_html).val(user.id);
								$('#edit_link', resource_html).show();
							} else {
								/* Update */
								if (_data.hasOwnProperty('id')) {
									$('#owner_id #' + user.id, resource_html).text(user.first_name + ' ' + user.last_name);
								/* Delete */
								} else {
									$('#owner_id #' + _id, resource_html).remove();
									$('#edit_link', resource_html).hide();
								}
							}
						}
					});
				});

				$('.resource-save', resource_html).click(function(ev) {
					ev.preventDefault();

					var $this = $(this);

					if (!$this.hasClass('disabled')) {
						$this.addClass('disabled');
						if (monster.ui.valid(resourceForm)) {
							var form_data = monster.ui.getFormData('resource-form');

							self.resourceCleanFormData(form_data);

							self.resourceSave(scope, form_data, data, callbacks.save_success);
						} else {
							$this.removeClass('disabled');
							monster.ui.alert('error', self.i18n.active().resources.there_were_errors_on_the_form);
						}
					}
				});

				$('.resource-delete', resource_html).click(function(ev) {
					ev.preventDefault();

					monster.ui.confirm(self.i18n.active().resources.are_you_sure_you_want_to_delete, function() {
						self.resourceDelete(scope, data.data.id, callbacks.delete_success);
					});
				});
			} else {
				data.data.resource_type = scope.resourceType;

				self.resourceRender(scope, data, $('.media_pane', resource_html), callbacks);
			}
		},

		resourceCleanFormData: function(form_data) {

			if ('media' in form_data && 'audio' in form_data.media) {
				form_data.media.audio.codecs = $.map(form_data.media.audio.codecs, function(val) { return (val) ? val : null; });
			}

			if(form_data.extra.flags) {
				// trims the string, then creates an array from it, and remove the empty elements
				form_data.flags = (form_data.extra.flags.replace(/\s/g,'').split(',')).filter(function(n) {
					return n != '';
				});
			}

			delete form_data.extra;

			return form_data;
		},

		resourceFixArrays: function(data, data2) {
			if (typeof data.gateways[0] === 'object' && typeof data2.gateways[0] === 'object') {
				(data.gateways[0] || {}).codecs = (data2.gateways[0] || {}).codecs;
			}

			return data;
		},

		resourceSave: function(scope, form_data, data, success) {
			var self = this,
				id = (typeof data.data === 'object' && data.data.id) ? data.data.id : undefined,
				normalized_data = self.resourceFixArrays($.extend(true, {}, data.data, form_data), form_data);

			if (id) {
				self.resourceUpdate(scope, normalized_data, function(_data, status) {
					success && success(_data, status, 'update');
				});
			} else {
				self.resourceCreate(scope, normalized_data, function(_data, status) {
					success && success(_data, status, 'create');
				});
			}
		},

		resourceGet: function(scope, resourceId, callback) {
			var self = this;

			self.callApi({
				resource: scope.sdk + '.get',
				data: {
					accountId: self.accountId,
					resourceId: resourceId
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		resourceCreate: function(scope, data, callback) {
			var self = this;

			self.callApi({
				resource: scope.sdk + '.create',
				data: {
					accountId: self.accountId,
					data: data
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		resourceUpdate: function(scope, data, callback) {
			var self = this;

			self.callApi({
				resource: scope.sdk + '.update',
				data: {
					accountId: self.accountId,
					resourceId: data.id,
					data: data
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		resourceDelete: function(scope, resourceId, callback) {
			var self = this;

			self.callApi({
				resource: scope.sdk + '.delete',
				data: {
					accountId: self.accountId,
					resourceId: resourceId
				},
				success: function(data) {
					callback && callback(data.data);
				}
			});
		},

		resourceDefineActions: function(args) {
			var self = this,
				callflow_nodes = args.actions;

			_.each(scopes, function(scope) {
				// Global resources are platform-wide carrier configuration, so that tab is
				// offered only to a superduper admin of a reseller account. Local resources
				// are account-level and are registered unconditionally.
				if (scope === scopes.global && !(monster.util.isReseller() && monster.util.isSuperDuper() && monster.util.isAdmin())) {
					return;
				}

				// Registered without the callflow-node properties (icon/category/tip/data/
				// rules/isUsable/weight/caption/edit), which keeps these entries out of the
				// callflow editor's palette while the entity manager still picks them up.
				callflow_nodes[scope.module + '[id=*]'] = {
					name: self.i18n.active().resources[scope.i18nKey],
					module: scope.module,
					listEntities: function(callback) {
						self.callApi({
							resource: scope.sdk + '.list',
							data: {
								accountId: self.accountId,
								filters: {
									paginate: false
								}
							},
							success: function(data) {
								_.each(data.data, function(resource) {
									// no jQuery wrapper since this template will be inserted directly with Handlebars
									resource.customEntityTemplate = '<div class="title standalone">' + resource.name + '</div>';
								});

								callback && callback(data.data);
							}
						});
					},
					editEntity: scope.editTopic
				};
			});
		}
	};

	return app;
});
