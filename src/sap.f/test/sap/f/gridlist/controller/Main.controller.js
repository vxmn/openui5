sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/base/Log"
], function (Controller, Log) {
	"use strict";

	return Controller.extend("sap.f.gridlist.controller.Main", {
        onInit: function () {
            var model = new sap.ui.model.json.JSONModel();
            var data = [
                { title: "Box title 1", subtitle: "Subtitle 1", group: "Group A", counter: 5 },
                { title: "Box title 2", subtitle: "Subtitle 2", group: "Group A", counter: 15 },
                { title: "Box title 3", subtitle: "Subtitle 3", group: "Group A", counter: 15734, busy: true },
                { title: "Box title 4", subtitle: "Subtitle 4", group: "Group A", counter: 2, blocked: true },
                { title: "Box title 5", subtitle: "Subtitle 5", group: "Group A", counter: 1 },
                { title: "Box title 6 Box title Box title Box title Box title Box title", subtitle: "Subtitle 6", group: "Group A", counter: 5 },
                { title: "Very long Box title that should wrap 7", subtitle: "This is a long subtitle 7", counter: 5 },
                { title: "Box title B 8", subtitle: "Subtitle 8", group: "Group B", counter: 0 },
                { title: "Box title B 9 Box title B  Box title B 9 Box title B 9Box title B 9title B 9 Box title B 9Box title B", subtitle: "Subtitle 9", group: "Group B" },
                { title: "Box title B 10", subtitle: "Subtitle 10", group: "Group B" },
                { title: "Box title B 11", subtitle: "Subtitle 11", group: "Group B" },
                { title: "Box title B 12", subtitle: "Subtitle 12", group: "Group B" },
                { title: "Box title 13", subtitle: "Subtitle 13", group: "Group A", counter: 5 },
                { title: "Box title 14", subtitle: "Subtitle 14", group: "Group A" },
                { title: "Box title 15", subtitle: "Subtitle 15", group: "Group A" },
                { title: "Box title 16", subtitle: "Subtitle 16", group: "Group A", counter: 37412578 },
                { title: "Box title 17", subtitle: "Subtitle 17", group: "Group A" },
                { title: "Box title 18", subtitle: "Subtitle 18", group: "Group A" },
                { title: "Very long Box title that should wrap 19", subtitle: "This is a long subtitle 19" },
                { title: "Box title B 20", subtitle: "Subtitle 20", group: "Group B", counter: 1, busy: true},
                { title: "Box title B 21", subtitle: "Subtitle 21", group: "Group B" },
                { title: "Box title B 22", subtitle: "Subtitle 22", group: "Group B", counter: 5, blocked: true },
                { title: "Box title B 23", subtitle: "Subtitle 23", group: "Group B", counter: 3 },
                { title: "Box title B 24", subtitle: "Subtitle 24", group: "Group B", counter: 5 },
                { title: "Box title B 21", subtitle: "Subtitle 21", group: "Group B" },
                { title: "Box title B 22", subtitle: "Subtitle 22", group: "Group B" },
                { title: "Box title B 23", subtitle: "Subtitle 23", group: "Group B" }
            ];

            model.setData(data);

            this.getView().setModel(model);
        },
        onLayoutChange: function (oEvent) {
            Log.error("[TEST] Layout Changed to " + oEvent.getParameter("layout"));
        },
        onSliderMoved: function (oEvent) {
            var value = oEvent.getParameter("value");
            this.getView().byId("growingGridListBoxes").getDomRef().style.width = value + "%";
		}
    });

});

