sap.ui.define([
	"sap/ui/model/json/JSONModel"
], function (JSONModel) {
	"use strict";

	return new JSONModel({
		selectedKey: 'overview',
		navigation: [
			{
				title: 'Overview',
				topicTitle: 'Integration Card Overview',
				icon: 'sap-icon://home',
				target: 'learnDetail',
				key: 'overview'
			},
			{
				title: 'Getting Started',
				topicTitle: 'Integration Card Getting Started',
				icon: 'sap-icon://initiative',
				target: 'learnDetail',
				key: 'gettingStarted'
			},
			{
				title: 'Headers',
				icon: 'sap-icon://header',
				target: 'learnDetail',
				key: 'headers',
				items: [
					{
						title: 'Default',
						target: 'learnDetail',
						key: 'headerDefault',
						topicTitle: 'Headers'
					},
					{
						title: 'Numeric',
						target: 'learnDetail',
						key: 'headerNumeric',
						topicTitle: 'Headers'
					}
				]
			},
			{
				title: 'Types',
				icon: 'sap-icon://overview-chart',
				target: 'learnDetail',
				key: 'types',
				items: [
					{
						title: 'List',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'list'
					},
					{
						title: 'Table',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'table'
					},
					{
						title: 'Object',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'object'
					},
					{
						title: 'Timeline',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'timeline'
					},
					{
						title: 'Analytical',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'analytical'
					},
					{
						title: 'Component',
						topicTitle: 'Types',
						target: 'learnDetail',
						key: 'component'
					}
				]
			},
			{
				title: 'Features',
				icon: 'sap-icon://activities',
				target: 'learnDetail',
				key: 'features',
				items: [
					{
						title: 'Actions',
						target: 'learnDetail',
						key: 'featureActions',
						topicTitle: 'Features'
					},
					{
						title: 'Data',
						target: 'learnDetail',
						key: 'featureData',
						topicTitle: 'Features'
					},
					{
						title: 'Translation',
						target: 'learnDetail',
						key: 'featureTranslation',
						topicTitle: 'Features'
					},
					{
						title: 'Manifest Parameters',
						target: 'learnDetail',
						key: 'featureManifestParameters',
						topicTitle: 'Features'
					},
					{
						title: 'Dynamic Parameters',
						target: 'learnDetail',
						key: 'featureDynamicParameters',
						topicTitle: 'Features'
					},
					{
						title: 'Dynamic Counter',
						target: 'learnDetail',
						key: 'featureDynamicCounter',
						topicTitle: 'Features'
					}
				]
			}
		]
	});
});