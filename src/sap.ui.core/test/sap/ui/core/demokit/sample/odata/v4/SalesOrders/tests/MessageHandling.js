/*!
 * ${copyright}
 */
sap.ui.define([
	"sap/base/Log",
	"sap/ui/core/library",
	"sap/ui/test/Opa5",
	"sap/ui/test/TestUtils"
], function (Log, library, Opa5, TestUtils) {
	"use strict";

	// shortcut for sap.ui.core.MessageType
	var MessageType = library.MessageType;

	return {
		checkMessages : function (Given, When, Then, sUIComponent) {
			var sNoteBoundWarning = "Enter customer reference if available",
				sNoteFailure = "Property `Note` value `RAISE_ERROR` not allowed!",
				sQuantityBoundError = "Minimum order quantity is 2",
				sQuantityFailure = "Value must be greater than 0",
				sUnboundInfo = "Example for an unbound message";

			if (TestUtils.isRealOData()) {
				Opa5.assert.ok(true, "Test runs only with mock data");
				return;
			}

			Given.iStartMyUIComponent({
				componentConfig : {
					name : sUIComponent || "sap.ui.core.sample.odata.v4.SalesOrders"
				}
			});

			// ************************************************************************************
			// Unbound/Bound Messages
			When.onTheMainPage.firstSalesOrderIsVisible();
			Then.onTheMainPage.checkMessageCount(2);
			Then.onTheMainPage.checkNoteValueState(1, "Warning", sNoteBoundWarning);

			When.onTheMainPage.pressMessagesButton();
			Then.onTheMainPage.checkMessages([{
				message : sUnboundInfo,
				type : MessageType.Information
			}, {
				message : sNoteBoundWarning,
				type : MessageType.Warning
			}]);

			When.onTheMainPage.selectMessage(sUnboundInfo);
			Then.onTheMainPage.checkMessageDetails(sUnboundInfo,
				"Details for \"Example for an unbound message\" (absolute longtext URL).");

			When.onTheMainPage.pressBackToMessagesButton();

			When.onTheMainPage.selectMessage(sNoteBoundWarning);
			Then.onTheMainPage.checkMessageDetails(sNoteBoundWarning,
				"Details for \"Enter customer reference if available\" (relative longtext URL).");

			When.onTheMainPage.pressBackToMessagesButton();

			When.onTheMainPage.pressMessagePopoverCloseButton();
			Then.onTheMainPage.checkMessageCount(1);
			Then.onTheMainPage.checkNoteValueState(1, "Warning", sNoteBoundWarning);

			When.onTheMainPage.pressMessagesButton();
			Then.onTheMainPage.checkMessages([{
				message : sNoteBoundWarning,
				type : MessageType.Warning
			}]);

			When.onTheMainPage.pressMessagePopoverCloseButton();
			When.onTheMainPage.selectSalesOrder(1);
			Then.onTheMainPage.checkMessageCount(2);
			Then.onTheMainPage.checkNoteValueState(1, "Warning", sNoteBoundWarning);
			Then.onTheMainPage.checkInputValueState("Note::detail", "Warning",
				sNoteBoundWarning);
			Then.onTheMainPage.checkSalesOrderLineItemQuantityValueState(1, "Error",
				sQuantityBoundError);

			When.onTheMainPage.pressMessagesButton();
			Then.onTheMainPage.checkMessages([{
					message : sNoteBoundWarning,
					type : MessageType.Warning
				}, {
					message : sQuantityBoundError,
					type : MessageType.Error
			}]);

			When.onTheMainPage.selectMessage(sQuantityBoundError);
			Then.onTheMainPage.checkMessageDetails(sQuantityBoundError,
				"Details for \"Minimum order quantity is 2\" (absolute longtext URL).");

			When.onTheMainPage.pressBackToMessagesButton();

			When.onTheMainPage.pressMessagePopoverCloseButton();
			Then.onTheMainPage.checkMessageCount(2);

			Then.onTheMainPage.checkNoteValueState(1, "Warning", sNoteBoundWarning);
			Then.onTheMainPage.checkInputValueState("Note::detail", "Warning", sNoteBoundWarning);
			Then.onTheMainPage.checkSalesOrderLineItemQuantityValueState(1, "Error",
				sQuantityBoundError);

			When.onTheMainPage.selectSalesOrder(0);
			Then.onTheMainPage.checkSalesOrderLineItemQuantityValueState(1, "None", "");
			Then.onTheMainPage.checkMessageCount(2);

			When.onTheMainPage.selectSalesOrder(1);
			Then.onTheMainPage.checkSalesOrderLineItemQuantityValueState(1, "Error",
				sQuantityBoundError);
			Then.onTheMainPage.checkMessageCount(2);

			When.onTheMainPage.pressMessagesButton();
			Then.onTheMainPage.checkMessages([{
					message : sNoteBoundWarning,
					type : MessageType.Warning
				}, {
					message : sQuantityBoundError,
					type : MessageType.Error
			}]);

			When.onTheMainPage.pressMessagePopoverCloseButton();

			// ************************************************************************************
			// Error Messages
			// PATCH scenario
			Then.onTheMainPage.checkMessageCount(2); // still two for 0500000001
			When.onTheMainPage.selectSalesOrder(4);
			When.onTheMainPage.changeNoteInSalesOrders(4, "RAISE_ERROR");
			When.onTheMainPage.pressSaveSalesOrdersButton();
			Then.onTheMainPage.checkMessages([{
					message : sNoteBoundWarning,
					type : MessageType.Warning
				}, {
					message : sQuantityBoundError,
					type : MessageType.Error
				}, {
					message : sNoteFailure,
					type : MessageType.Error
			}]);
			Then.onTheMainPage.checkNoteValueState(4, "Error", sNoteFailure);
			When.onTheMainPage.pressMessagePopoverCloseButton();
			When.onTheMainPage.changeNoteInSalesOrders(4, "any Note");
			When.onTheMainPage.pressSaveSalesOrdersButton();
			Then.onTheMainPage.checkNoteValueState(4, "None", "");
			Then.onTheMainPage.checkMessageCount(2);

			// POST scenario
			When.onTheMainPage.pressCreateSalesOrderItemButton();
			When.onTheMainPage.changeQuantityInLineItem(6, "0");
			When.onTheMainPage.pressSaveSalesOrderButton();
			Then.onTheMainPage.checkSalesOrderLineItemQuantityValueState(6, "Error",
				sQuantityFailure);
			Then.onTheMainPage.checkMessages([{
					message : sNoteBoundWarning,
					type : MessageType.Warning
				}, {
					message : sQuantityBoundError,
					type : MessageType.Error
				}, {
					message : sQuantityFailure,
					type : MessageType.Error
			}]);
			When.onTheMainPage.pressMessagePopoverCloseButton();
			When.onTheMainPage.changeQuantityInLineItem(6, "2.0");
			When.onTheMainPage.pressSaveSalesOrderButton();
			When.onTheSuccessInfo.confirm();
			Then.onTheMainPage.checkMessageCount(2);

			Then.onAnyPage.checkLog([{
					component : "sap.ui.model.odata.v4.Context",
					level : Log.Level.ERROR,
					message: "Failed to update path /SalesOrderList('0500000004')/Note",
					details : "Property `Note` value `RAISE_ERROR` not allowed!"
				}, {
					component : "sap.ui.model.odata.v4.ODataListBinding",
					level : Log.Level.ERROR,
					message: "POST on 'SalesOrderList('0500000004')/SO_2_SOITEM' failed"
						+ "; will be repeated automatically",
					details : "Value must be greater than 0"
			}]);

			Then.iTeardownMyUIComponent();
		}
	};
});