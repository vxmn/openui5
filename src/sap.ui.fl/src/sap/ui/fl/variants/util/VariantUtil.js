/*!
 * ${copyright}
 */

sap.ui.define([
	"sap/ui/thirdparty/jquery",
	"sap/ui/core/Component",
	"sap/ui/fl/Utils",
	"sap/ui/core/routing/History",
	"sap/ui/core/routing/HashChanger",
	"sap/base/Log",
	"sap/base/util/deepEqual",
	"sap/ui/base/ManagedObjectObserver"
], function(
	jQuery,
	Component,
	flUtils,
	History,
	HashChanger,
	Log,
	deepEqual,
	ManagedObjectObserver
) {
	"use strict";

	/**
	 * Provides utility functions for <code>sap.ui.fl.variants.VariantModel</code>.
	 * The functions should be called with an instance of <code>sap.ui.fl.variants.VariantModel</code>.
	 *
	 * @namespace
	 * @alias sap.ui.fl.variants.util.VariantUtil
	 * @author SAP SE
	 * @version ${version}
	 * @experimental Since 1.56.0
	 */

	var VariantUtil = {
		variantTechnicalParameterName: "sap-ui-fl-control-variant-id",

		initializeHashRegister: function () {
			this._oHashRegister = {
				currentIndex: null,
				hashParams: [],
				variantControlIds: []
			};

			// register navigation filter for custom navigation
			VariantUtil._setOrUnsetCustomNavigationForParameter.call(this, true);
		},

		attachHashHandlers: function (sVariantManagementReference, sUpdateURL) {
			// only for first variant management control with 'updateVariantInURL' property set to true
			if (this._oHashRegister.currentIndex === null) {
				var oHashChanger = HashChanger.getInstance();

				// de-register method to process hash changes
				var fnObserverHandler = function () {
					// variant switch promise needs to be checked, since there might be a pending on-going variants switch
					// which might result in unnecessary data being stored
					return this._oVariantSwitchPromise.then(function() {
						// deregister navigation filter if ushell is available
						VariantUtil._setOrUnsetCustomNavigationForParameter.call(this, false);
						// detach handler to check if hash was replaced
						oHashChanger.detachEvent("hashReplaced", VariantUtil._handleHashReplaced, this);
						// detach navigation handler
						oHashChanger.detachEvent("hashChanged", VariantUtil._navigationHandler, this);
						// clear variant controller map
						this.oChangePersistence.resetVariantMap();
						// destroy VariantModel
						this.destroy();
						// destroy oAppComponent.destroy() observer
						this.oComponentDestroyObserver.unobserve(this.oAppComponent, { destroy: true });
						this.oComponentDestroyObserver.destroy();
					}.bind(this));
				};

				if (!this.oComponentDestroyObserver && this.oAppComponent instanceof Component) {
					// observer for oAppComponent.destroy()
					this.oComponentDestroyObserver = new ManagedObjectObserver(fnObserverHandler.bind(this));
					this.oComponentDestroyObserver.observe(this.oAppComponent, {destroy: true});
				}

				if (sUpdateURL) {
					// attach handler to check if hash was replaced
					oHashChanger.attachEvent("hashReplaced", VariantUtil._handleHashReplaced, this);
					// attach handler to process hash changes
					oHashChanger.attachEvent("hashChanged", VariantUtil._navigationHandler, this);
					// first explicit call
					VariantUtil._navigationHandler.call(this);
				}
			}
			if (sUpdateURL) {
				if (Array.isArray(this._oHashRegister.variantControlIds[this._oHashRegister.variantControlIds])) {
					this._oHashRegister.variantControlIds[this._oHashRegister.currentIndex].push(sVariantManagementReference);
				} else {
					this._oHashRegister.variantControlIds[this._oHashRegister.currentIndex] = [sVariantManagementReference];
				}
			}
		},

		updateHasherEntry: function(mPropertyBag) {
			if (!mPropertyBag || !Array.isArray(mPropertyBag.parameters)) {
				Log.info("Variant URL parameters could not be updated since invalid parameters were received");
				return;
			}
			if (mPropertyBag.updateURL) {
				flUtils.setTechnicalURLParameterValues(
					mPropertyBag.component || this.oAppComponent,
					VariantUtil.variantTechnicalParameterName,
					mPropertyBag.parameters
				);
			}
			if (!mPropertyBag.ignoreRegisterUpdate) {
				this._oHashRegister.hashParams[this._oHashRegister.currentIndex] = mPropertyBag.parameters;
			}
		},

		_handleHashReplaced: function (oEvent) {
			this._sReplacedHash = oEvent.getParameter("sHash");
		},

		_navigationHandler: function(oEvent) {
			var sDirection;
			var sNewHash = oEvent && oEvent.getParameter("newHash");

			// check 2 for navigation - do not handle replaced hashes
			if (sNewHash && this._sReplacedHash === sNewHash) {
				delete this._sReplacedHash;
				return;
			}
			// initialization - no direction required
			if (this._oHashRegister.currentIndex === null) {
				this._oHashRegister.currentIndex = 0;
				sDirection = "NewEntry";
			} else {
				sDirection = History.getInstance().getDirection();
				switch (sDirection) {
					case "Backwards":
						this._oHashRegister.currentIndex--;
						break;
					case "Forwards":
					case "NewEntry":
						this._oHashRegister.currentIndex++;
						break;
					case "Unknown":
						//if direction ambiguity is present reset hash register
						this._oHashRegister.currentIndex = 0;
						this._oHashRegister.hashParams = [];
						this._oHashRegister.variantControlIds = [];
						this.switchToDefaultForVariant();
						break;
					default:
						return;
				}
			}

			if (this._oHashRegister.currentIndex >= 0) {
				var aVariantParamValues;
				var mPropertyBag = {};
				if (sDirection === "NewEntry" || sDirection === "Unknown") {
					// get URL hash parameters
					var mHashParameters = flUtils.getParsedURLHash() && flUtils.getParsedURLHash().params;
					aVariantParamValues = (
						mHashParameters && mHashParameters[VariantUtil.variantTechnicalParameterName]
					) || [];

					var bURLUpdateRequired = VariantUtil._adjustForDuplicateParameters.call(this, aVariantParamValues);

					aVariantParamValues = aVariantParamValues.map(function(sParameterValue) {
						return decodeURIComponent(sParameterValue);
					});

					// check if variant management control for previously existing register entry exists
					// if yes, reset to default variant
					var aExisitingParams = this._oHashRegister.variantControlIds[this._oHashRegister.currentIndex];
					if (Array.isArray(aExisitingParams)) {
						aExisitingParams.forEach(function(sParam) {
							this.switchToDefaultForVariantManagement(sParam);
						}.bind(this));
					}

					// do not update URL parameters if new entry/unknown
					mPropertyBag = {
						parameters: aVariantParamValues,
						updateURL: !!bURLUpdateRequired
					};
				} else {
					aVariantParamValues = this._oHashRegister.hashParams[this._oHashRegister.currentIndex];
					mPropertyBag = {
						parameters: aVariantParamValues,
						updateURL: true,
						ignoreRegisterUpdate: true
					};
				}
			} else {
				// e.g. when index is -1, variant parameter is removed with no entry
				mPropertyBag = {
					parameters: [],
					updateURL: true,
					ignoreRegisterUpdate: true
				};
			}
			this.updateHasherEntry(mPropertyBag);
		},

		_adjustForDuplicateParameters: function(aVariantParamValues) {
			// calculate if duplicate / higher level variant parameter exists
			if (aVariantParamValues.length > 1) {
				return Object.keys(this.oData).reduce(
					function(bURLUpdateRequired, sVariantManagementReference) {
						var sCurrentVariant = this.oData[sVariantManagementReference].currentVariant;
						this.oData[sVariantManagementReference].variants.forEach(function (oVariant) {
							var iVariantIndex = aVariantParamValues.indexOf(oVariant.key);
							// if variantReference exists in this sVariantManagementReference
							// and it's not the current variant
							if (iVariantIndex > -1 && oVariant.key !== sCurrentVariant) {
								aVariantParamValues.splice(iVariantIndex, 1);
								bURLUpdateRequired = true;
							}
						});
						return bURLUpdateRequired;
					}.bind(this), false
				);
			}
		},

		_setOrUnsetCustomNavigationForParameter: function(bSet) {
			var sMethodName = bSet ? "registerNavigationFilter" : "unregisterNavigationFilter";
			var oUshellContainer = flUtils.getUshellContainer();
			if (oUshellContainer) {
				oUshellContainer.getService("ShellNavigation")[sMethodName](VariantUtil._navigationFilter);
			}
		},

		_navigationFilter: function(sNewHash, sOldHash) {
			var oUshellContainer = flUtils.getUshellContainer();
			var oURLParsing = oUshellContainer.getService("URLParsing");
			var oShellNavigation = oUshellContainer.getService("ShellNavigation");

			var oOldParsed = oURLParsing.parseShellHash(sOldHash);
			var oNewParsed = oURLParsing.parseShellHash(sNewHash);

			// checkpoint 1:
			// - suppress only when parameters exist
			// - variant parameter should exist on either of the parsed hashes
			// - undefined parameters will be equal and return false
			var bSuppressDefaultNavigation = oOldParsed
				&& oNewParsed
				&& (oOldParsed.params.hasOwnProperty(VariantUtil.variantTechnicalParameterName) || oNewParsed.params.hasOwnProperty(VariantUtil.variantTechnicalParameterName))
				&& !deepEqual(oOldParsed.params[VariantUtil.variantTechnicalParameterName], oNewParsed.params[VariantUtil.variantTechnicalParameterName]);

			// checkpoint 2:
			// - other keys except 'appSpecificRoute' and 'params' should match
			if (bSuppressDefaultNavigation) {
				// Verify if other parsed url properties are the same
				for (var sKey in oOldParsed) {
					if (
						sKey !== "params"
						&& sKey !== "appSpecificRoute"
						&& oOldParsed[sKey] !== oNewParsed[sKey]
					) {
						bSuppressDefaultNavigation = false;
						break;
					}
				}
			}

			// checkpoint 3:
			// - variant parameter should be the only parameter existing
			if (bSuppressDefaultNavigation) {
				bSuppressDefaultNavigation =
					// true returned from some() if other parameters exist, which is then negated
					!([oOldParsed, oNewParsed].some(function (oParsedHash) {
						if (oParsedHash.params.hasOwnProperty(VariantUtil.variantTechnicalParameterName)) {
								// If parameter exists but it's not the only one, it's invalid
							return Object.keys(oParsedHash.params).length > 1;
						}
						return Object.keys(oParsedHash.params).length > 0;
					}
					));
			}

			if (bSuppressDefaultNavigation) {
				var sAppSpecificRoute = (oNewParsed.appSpecificRoute || "  ").substring(2);  // strip &/
				var sOldAppSpecificRoute = (oOldParsed.appSpecificRoute || "  ").substring(2);  // strip &/
				oShellNavigation.hashChanger.fireEvent("hashChanged", { newHash : sAppSpecificRoute, oldHash : sOldAppSpecificRoute });
				return {
					// causes no navigation to happen and replaces hash in the URL
					status: oShellNavigation.NavigationFilterStatus.Custom
				};
			}
			return oShellNavigation.NavigationFilterStatus.Continue;
		},

		getCurrentHashParamsFromRegister: function () {
			if (
				jQuery.isNumeric(this._oHashRegister.currentIndex)
				&& this._oHashRegister.currentIndex >= 0
			) {
				// return clone
				return Array.prototype.slice.call(this._oHashRegister.hashParams[this._oHashRegister.currentIndex]);
			}
		}
	};
	return VariantUtil;
}, true);