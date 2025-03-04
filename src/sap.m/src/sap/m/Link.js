/*!
 * ${copyright}
 */

// Provides control sap.m.Link.
sap.ui.define([
	'./library',
	'sap/ui/core/Control',
	'sap/ui/core/InvisibleText',
	'sap/ui/core/EnabledPropagator',
	'sap/ui/core/LabelEnablement',
	'sap/ui/core/library',
	'sap/ui/Device',
	'./LinkRenderer',
	"sap/ui/events/KeyCodes",
	"sap/base/Log",
		"sap/base/security/URLWhitelist"
],
function(
	library,
	Control,
	InvisibleText,
	EnabledPropagator,
	LabelEnablement,
	coreLibrary,
	Device,
	LinkRenderer,
	KeyCodes,
	Log,
	URLWhitelist
) {
	"use strict";



	// shortcut for sap.ui.core.TextDirection
	var TextDirection = coreLibrary.TextDirection;

	// shortcut for sap.ui.core.TextAlign
	var TextAlign = coreLibrary.TextAlign;



	/**
	 * Constructor for a new <code>Link</code>.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * A hyperlink control used to navigate to other apps and web pages or to trigger actions.
	 *
	 * <h3>Overview</h3>
	 *
	 * The <code>Link</code> control is a clickable text element visualized in such a way that it stands out
	 * from the standard text. On hover, it changes its style to underlined text to provide
	 * additional feedback to the user.
	 *
	 * <h3>Usage</h3>
	 *
	 * You can set the <code>Link</code> to be enabled or disabled.
	 *
	 * To create a visual hierarchy in large lists of links, you can set the less important links as
	 * <code>subtle</code> or the more important ones as <code>emphasized</code>.
	 *
	 * To specify where the linked content is opened, you can use the <code>target</code> property.
	 *
	 * <h3>Responsive behavior</h3>
	 *
	 * If there is not enough space, the text of the <code>Link</code> becomes truncated.
	 * If the <code>wrapping</code> property is set to <code>true</code>, the text will be
	 * displayed on several lines, instead of being truncated.
	 *
	 * @see {@link fiori:https://experience.sap.com/fiori-design-web/link/ Link}
	 *
	 * @extends sap.ui.core.Control
	 * @implements sap.ui.core.IShrinkable, sap.ui.core.IFormContent
	 *
	 * @author SAP SE
	 * @version ${version}
	 *
	 * @constructor
	 * @public
	 * @since 1.12
	 * @alias sap.m.Link
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var Link = Control.extend("sap.m.Link", /** @lends sap.m.Link.prototype */ { metadata : {

		interfaces : [
			"sap.ui.core.IShrinkable",
			"sap.ui.core.IFormContent"
		],
		library : "sap.m",
		designtime: "sap/m/designtime/Link.designtime",
		properties : {

			/**
			 * Defines the displayed link text.
			 */
			text : {type : "string", group : "Data", defaultValue : ''},

			/**
			 * Determines whether the link can be triggered by the user.
			 */
			enabled : {type : "boolean", group : "Behavior", defaultValue : true},

			/**
			 * Specifies a target where the linked content will open.
			 *
			 * Options are the standard values for window.open() supported by browsers:
			 * <code>_self</code>, <code>_top</code>, <code>_blank</code>, <code>_parent</code>, <code>_search</code>.
			 * Alternatively, a frame name can be entered. This property is only used when the <code>href</code> property is set.
			 */
			target : {type : "string", group : "Behavior", defaultValue : null},

			/**
			 * Determines the width of the link (CSS-size such as % or px). When it is set, this is the exact size.
			 * When left blank, the text defines the size.
			 */
			width : {type : "sap.ui.core.CSSSize", group : "Dimension", defaultValue : null},

			/**
			 * Defines the link target URI. Supports standard hyperlink behavior. If a JavaScript action should be triggered,
			 * this should not be set, but instead an event handler for the <code>press</code> event should be registered.
			 */
			href : {type : "sap.ui.core.URI", group : "Data", defaultValue : null},

			/**
			 * Defines whether the link target URI should be validated.
			 *
			 * If validation fails, the value of the <code>href</code> property will still be set, but will not be applied to the DOM.
			 *
			 * <b>Note:</b> Additional whitelisting of URLs is allowed through
			 * {@link module:sap/base/security/URLWhitelist URLWhitelist}.
			 *
			 * @since 1.54.0
			 */
			validateUrl : {type : "boolean", group : "Data", defaultValue : false},

			/**
			 * Determines whether the link text is allowed to wrap when there is no sufficient space.
			 */
			wrapping : {type : "boolean", group : "Appearance", defaultValue : false},

			/**
			 * Determines the horizontal alignment of the text.
			 * @since 1.28.0
			 */
			textAlign : {type : "sap.ui.core.TextAlign", group : "Appearance", defaultValue : TextAlign.Initial},

			/**
			 * This property specifies the element's text directionality with enumerated options. By default, the control inherits text direction from the parent DOM.
			 * @since 1.28.0
			 */
			textDirection : {type : "sap.ui.core.TextDirection", group : "Appearance", defaultValue : TextDirection.Inherit},

			/**
			 * Subtle links look more like standard text than like links. They should only be used to help with visual hierarchy between large data lists of important and less important links. Subtle links should not be used in any other use case.
			 * @since 1.22
			 */
			subtle : {type : "boolean", group : "Behavior", defaultValue : false},

			/**
			 * Emphasized links look visually more important than regular links.
			 * @since 1.22
			 */
			emphasized : {type : "boolean", group : "Behavior", defaultValue : false}
		},
		associations : {

			/**
			 * Association to controls / ids which describe this control (see WAI-ARIA attribute aria-describedby).
			 */
			ariaDescribedBy: {type: "sap.ui.core.Control", multiple: true, singularName: "ariaDescribedBy"},

			/**
			 * Association to controls / ids which label this control (see WAI-ARIA attribute aria-labelledby).
			 */
			ariaLabelledBy: {type: "sap.ui.core.Control", multiple: true, singularName: "ariaLabelledBy"}
		},
		events : {

			/**
			 * Event is fired when the user triggers the link control.
			 */
			press : {
				allowPreventDefault : true,
				parameters: {
					/**
					 * Indicates whether the CTRL key was pressed when the link was selected.
					 * @since 1.58
					 */
					ctrlKey: { type: "boolean" },
					/**
					 * Indicates whether the "meta" key was pressed when the link was selected.
					 *
					 * On Macintosh keyboards, this is the command key (⌘).
					 * On Windows keyboards, this is the windows key (⊞).
					 *
					 * @since 1.58
					 */
					metaKey: { type: "boolean" }
				}
			}
		},
		dnd: { draggable: true, droppable: false }
	}});



	EnabledPropagator.call(Link.prototype); // inherit "disabled" state from parent controls

	/**
	 * Required adaptations before rendering.
	 *
	 * @private
	 */
	Link.prototype.onBeforeRendering = function() {};

	/**
	 * Triggers link activation when space key is pressed on the focused control.
	 *
	 * @param {jQuery.Event} oEvent The SPACE keyboard key event object
	 */
	Link.prototype.onsapspace = function(oEvent) {
		if (this.getEnabled() || this.getHref()) {
			// mark the event for components that needs to know if the event was handled by the link
			oEvent.setMarked();
			oEvent.preventDefault();
		}
	};

	Link.prototype.onkeyup = function (oEvent) {
		if (oEvent.which === KeyCodes.SPACE) {
			this._handlePress(oEvent);

			if (this.getHref() && !oEvent.isDefaultPrevented()) {
				// Normal browser link, the browser does the job. According to the keyboard spec, space should fire press event on keyup.
				// To make the browser REALLY do the same (history, referrer, frames, target,...), create a new "click" event and let the browser "do the needful".

				// first disarm the Space key event
				oEvent.preventDefault(); // prevent any scrolling which the browser might do because from its perspective the Link does not handle the "space" key
				oEvent.setMarked();

				// then create the click event
				var oClickEvent = document.createEvent('MouseEvents');
				oClickEvent.initEvent('click' /* event type */, false, true); // non-bubbling, cancelable
				this.getDomRef().dispatchEvent(oClickEvent);
			}
		}
	};


	/**
	 * Handler for the <code>press</code> event of the link.
	 *
	 * @param {jQuery.Event} oEvent The <code>press</code> event object
	 * @private
	 */
	Link.prototype._handlePress = function(oEvent) {

		if (this.getEnabled()) {
			// mark the event for components that needs to know if the event was handled by the link
			oEvent.setMarked();

			if (!this.firePress({ctrlKey: !!oEvent.ctrlKey, metaKey: !!oEvent.metaKey}) || !this.getHref()) { // fire event and check return value whether default action should be prevented
				oEvent.preventDefault();
			}
		} else { // disabled
			oEvent.preventDefault(); // even prevent URLs from being triggered
		}
	};

	/**
	 * Handle when enter is pressed.
	 *
	 * @param {jQuery.Event} oEvent The event object.
	 * @private
	 */
	Link.prototype.onsapenter = Link.prototype._handlePress;

	if (Device.support.touch) {
		Link.prototype.ontap = Link.prototype._handlePress;
	} else {
		Link.prototype.onclick = Link.prototype._handlePress;
	}

	/**
	 * Handles the touch event on mobile devices.
	 *
	 * @param {jQuery.Event} oEvent The <code>touchstart</code> event object
	 */
	Link.prototype.ontouchstart = function(oEvent) {
		if (this.getEnabled()) {
			// for controls which need to know whether they should handle events bubbling from here
			oEvent.setMarked();
		}
	};


	/* override standard setters with direct DOM manipulation */

	Link.prototype.setText = function(sText){
		var $this = this.$();
		this.setProperty("text", sText, true);
		sText = this.getProperty("text");
		if (this.writeText) {
			this.writeText(sText);
		} else {
			$this.text(sText);
		}
		if (sText) {
			$this.attr("tabindex", "0");
		} else {
			$this.attr("tabindex", "-1");
		}
		return this;
	};

	Link.prototype.setHref = function(sUri){
		var bIsValid = this._isHrefValid(sUri);

		this.setProperty("href", sUri, true);

		if (!bIsValid) {
			this.$().removeAttr("href");
			Log.warning(this + ": The href tag of the link was not set since it's not valid.");
			return this;
		}

		if (this.getEnabled()) {
			sUri = this.getProperty("href");
			if (!sUri) {
				this.$().removeAttr("href");
			} else {
				this.$().attr("href", sUri);
			}
		}

		return this;
	};

	Link.prototype.setSubtle = function(bSubtle){
		this.setProperty("subtle", bSubtle, true);

		var $this = this.$();
		if ($this.length) { // only when actually rendered
			$this.toggleClass("sapMLnkSubtle", bSubtle);

			if (bSubtle) {
				Link._addToDescribedBy($this, this._sAriaLinkSubtleId);
			} else {
				Link._removeFromDescribedBy($this, this._sAriaLinkSubtleId);
			}
		}

		if (bSubtle && !Link.prototype._sAriaLinkSubtleId) {
			Link.prototype._sAriaLinkSubtleId = InvisibleText.getStaticId("sap.m", "LINK_SUBTLE");
		}

		return this;
	};

	Link.prototype.setEmphasized = function(bEmphasized){
		this.setProperty("emphasized", bEmphasized, true);

		var $this = this.$();
		if ($this.length) { // only when actually rendered
			$this.toggleClass("sapMLnkEmphasized", bEmphasized);

			if (bEmphasized) {
				Link._addToDescribedBy($this, this._sAriaLinkEmphasizedId);
			} else {
				Link._removeFromDescribedBy($this, this._sAriaLinkEmphasizedId);
			}
		}

		if (bEmphasized && !Link.prototype._sAriaLinkEmphasizedId) {
			Link.prototype._sAriaLinkEmphasizedId = InvisibleText.getStaticId("sap.m", "LINK_EMPHASIZED");
		}

		return this;
	};

	Link.prototype.setWrapping = function(bWrapping){
		this.setProperty("wrapping", bWrapping, true);
		this.$().toggleClass("sapMLnkWrapping", bWrapping);
		return this;
	};

	Link.prototype.setEnabled = function(bEnabled){
		bEnabled = this.validateProperty("enabled", bEnabled);

		if (bEnabled !== this.getProperty("enabled")) { // do nothing when the same value is set again (virtual table scrolling!) - don't use this.getEnabled() because of EnabledPropagator
			this.setProperty("enabled", bEnabled, true);
			var $this = this.$();
			$this.toggleClass("sapMLnkDsbl", !bEnabled);
			if (bEnabled) {
				$this.attr("disabled", false);
				if (this.getText()) {
					$this.attr("tabindex", "0");
				} else {
					$this.attr("tabindex", "-1");
				}
				$this.removeAttr("aria-disabled");
				if (this.getHref()) {
					$this.attr("href", this.getHref());
				}
			} else {
				$this.attr("disabled", true);
				$this.attr("aria-disabled", true);
				$this.removeAttr("href");
				$this.removeAttr("tabindex");
			}
		}
		return this;
	};

	Link.prototype.setWidth = function(sWidth){
		this.setProperty("width", sWidth, true);
		this.$().toggleClass("sapMLnkMaxWidth", !sWidth);
		this.$().css("width", sWidth);
		return this;
	};

	Link.prototype.setTarget = function(sTarget){
		this.setProperty("target", sTarget, true);
		if (!sTarget) {
			this.$().removeAttr("target");
		} else {
			this.$().attr("target", sTarget);
		}
		return this;
	};

	/*************************************** Static members ******************************************/

	/**
	 * Checks if the given sUri is valid depending on the validateUrl property
	 *
	 * @param {String} sUri
	 * @returns {Boolean}
	 * @private
	 */
	Link.prototype._isHrefValid = function (sUri) {
		return this.getValidateUrl() ? URLWhitelist.validate(sUri) : true;
	};

	/**
	 * Adds ARIA InvisibleText ID to aria-secribedby
	 *
	 * @param {Object} $oLink control DOM reference
	 * @param {String} sInvisibleTextId  static Invisible Text ID to be added
	 */
	Link._addToDescribedBy = function ($oLink, sInvisibleTextId) {
		var sAriaDescribedBy = $oLink.attr("aria-describedby");

		if (sAriaDescribedBy) {
			$oLink.attr("aria-describedby",  sAriaDescribedBy + " " +  sInvisibleTextId); // Add the ID at the end, separated with space
		} else {
			$oLink.attr("aria-describedby",  sInvisibleTextId);
		}
	};

	/**
	 * Removes ARIA InvisibleText ID from aria-secribedby or the attribute itself
	 *
	 * @param {Object} $oLink control DOM reference
	 * @param {String} sInvisibleTextId  static Invisible Text ID to be removed
	 */
	Link._removeFromDescribedBy = function ($oLink, sInvisibleTextId) {
		var sAriaDescribedBy = $oLink.attr("aria-describedby");

		if (sAriaDescribedBy && sAriaDescribedBy.indexOf(sInvisibleTextId) !== -1) { // Remove only the static InvisibleText ID for Emphasized link
			sAriaDescribedBy = sAriaDescribedBy.replace(sInvisibleTextId, '');

			if (sAriaDescribedBy.length > 1) {
				$oLink.attr("aria-describedby",  sAriaDescribedBy);
			} else {
				$oLink.removeAttr("aria-describedby"); //  Remove the aria-describedby attribute, as it`s not needed
			}
		}
	};

	/**
	 * Returns the <code>sap.m.Link</code>  accessibility information.
	 *
	 * @see sap.ui.core.Control#getAccessibilityInfo
	 * @protected
	 * @returns {Object} The <code>sap.m.Link</code>  accessibility information
	 */
	Link.prototype.getAccessibilityInfo = function() {
		return {
			role: "link",
			type: this.getText() ? sap.ui.getCore().getLibraryResourceBundle("sap.m").getText("ACC_CTR_TYPE_LINK") : undefined,
			description: this.getText() || this.getHref() || "",
			focusable: this.getEnabled(),
			enabled: this.getEnabled()
		};
	};

	/*
	 * Link must not be stretched in Form because this would stretch the size of the focus outline
	 */
	Link.prototype.getFormDoNotAdjustWidth = function() {
		return true;
	};

	/*
	 * Provides hook for overriding the tabindex in case the link is used in a composite control
	 * for example inside ObjectAttribute
	 */
	Link.prototype._getTabindex = function() {
		return this.getText() ? "0" : "-1";
	};

	/*
	 * Determines whether self-reference should be added.
	 *
	 * @returns {boolean}
	 * @private
	 */
	Link.prototype._determineSelfReferencePresence = function () {
		var aAriaLabelledBy = this.getAriaLabelledBy(),
			bBrowserIsIE = Device.browser.msie,
			bAlreadyHasSelfReference = aAriaLabelledBy.indexOf(this.getId()) !== -1,
			bHasReferencingLabels = LabelEnablement.getReferencingLabels(this).length > 0,
			oParent = this.getParent(),
			bAllowEnhancingByParent = !!(oParent && oParent.enhanceAccessibilityState);

		// When the link has aria-labelledby attribute, screen readers will read the references inside, rather
		// than the link's text. For this reason a self-reference should be added in such cases.
		// Note: self-reference isn't needed in IE. Adding it would result in the link's text being read out twice.
		return !bBrowserIsIE && !bAlreadyHasSelfReference &&
			(aAriaLabelledBy.length > 0 || bHasReferencingLabels || bAllowEnhancingByParent);
	};

	return Link;

});