/*!
 * ${copyright}
 */
sap.ui.define([
	"jquery.sap.global",
	"sap/base/Log",
	"sap/ui/base/SyncPromise",
	"sap/ui/model/Context",
	"sap/ui/model/odata/v4/Context",
	"sap/ui/model/odata/v4/lib/_GroupLock",
	"sap/ui/model/odata/v4/lib/_Helper"
], function (jQuery, Log, SyncPromise, BaseContext, Context, _GroupLock, _Helper) {
	/*global QUnit, sinon */
	/*eslint no-warning-comments: 0 */
	"use strict";

	//*********************************************************************************************
	QUnit.module("sap.ui.model.odata.v4.Context", {
		beforeEach : function () {
			this.oLogMock = this.mock(Log);
			this.oLogMock.expects("warning").never();
			this.oLogMock.expects("error").never();
		}
	});

	//*********************************************************************************************
	QUnit.test("VIRTUAL", function (assert) {
		assert.throws(function () {
			Context.VIRTUAL = 42;
		}, TypeError, "immutable");

		assert.strictEqual(Context.VIRTUAL, -9007199254740991/*Number.MIN_SAFE_INTEGER*/);
	});

	//*********************************************************************************************
	QUnit.test("create", function (assert) {
		var oBinding = {},
			oContext,
			oCreatedPromise,
			bCreatedPromisePending = true,
			oModel = {},
			sPath = "/foo",
			fnResolve;

		// see below for tests with oBinding parameter
		// no createdPromise
		oContext = Context.create(oModel, oBinding, sPath, 42);

		assert.ok(oContext instanceof BaseContext);
		assert.strictEqual(oContext.getModel(), oModel);
		assert.strictEqual(oContext.getBinding(), oBinding);
		assert.strictEqual(oContext.getPath(), sPath);
		assert.strictEqual(oContext.getModelIndex(), 42);
		assert.strictEqual(oContext.created(), undefined);
		assert.strictEqual(oContext.getReturnValueContextId(), undefined);

		// code under test
		oContext = Context.create(oModel, oBinding, sPath, 42,
			new Promise(function (resolve, reject) {
				fnResolve = resolve;
			}));

		// code under test
		oCreatedPromise = oContext.created();

		assert.ok(oCreatedPromise instanceof Promise, "Instance of Promise");
		oCreatedPromise.then(function (oResult) {
				bCreatedPromisePending = false;
				assert.strictEqual(oResult, undefined, "create promise resolves w/o data ('bar')");
			}, function () {
				bCreatedPromisePending = false;
			});
		assert.ok(bCreatedPromisePending, "Created Promise still pending");

		fnResolve("bar");
		return oCreatedPromise.then(function () {
			assert.strictEqual(bCreatedPromisePending, false, "Created Promise resolved");
		});
	});

	//*********************************************************************************************
	QUnit.test("createReturnValueContext", function (assert) {
		var oBinding = {},
			oContext,
			oModel = {},
			sPath = "/foo";

		// code under test (return value context)
		oContext = Context.createReturnValueContext(oModel, oBinding, sPath);

		assert.notEqual(oContext.getReturnValueContextId(), undefined);
		assert.strictEqual(oContext.getReturnValueContextId(), oContext.getReturnValueContextId());

		// code under test (return value contexts have different IDs)
		assert.notEqual(
			Context.createReturnValueContext(oModel, oBinding, sPath).getReturnValueContextId(),
			oContext.getReturnValueContextId());
	});

	//*********************************************************************************************
	[
		{getReturnValueContextId : function () {}},
		{},
		undefined
	].forEach(function (oParentContext, i) {
		QUnit.test("getReturnValueContextId: relative - " + i, function (assert) {
			var oBinding = {
					oContext : oParentContext,
					bRelative : true
				},
				oContext,
				oModel = {},
				vReturnValueContextId = {};

			oContext = Context.create(oModel, oBinding, "/foo/bar");

			if (i === 0) {
				this.mock(oParentContext).expects("getReturnValueContextId")
					.withExactArgs().returns(vReturnValueContextId);
			}

			// code under test
			assert.strictEqual(oContext.getReturnValueContextId(),
				i === 0 ? vReturnValueContextId : undefined);
		});
	});

	//*********************************************************************************************
	QUnit.test("getReturnValueContextId: absolute binding", function (assert) {
		var oParentContext = {getReturnValueContextId : function () {}},
			oBinding = {
				// context is set even if not used because binding is absolute
				oContext : oParentContext,
				bRelative : false
			},
			oContext,
			oModel = {};

		oContext = Context.create(oModel, oBinding, "/foo/bar");

		this.mock(oParentContext).expects("getReturnValueContextId").never();

		// code under test
		assert.strictEqual(oContext.getReturnValueContextId(), undefined);
	});

	//*********************************************************************************************
	QUnit.test("getModelIndex() adds number of created contexts", function (assert) {
		var oBinding = {},
			oContext;

		oContext = Context.create(null/*oModel*/, oBinding, "/foo", 42);

		assert.strictEqual(oContext.getModelIndex(), 42);

		// simulate ODataListBinding#create (7x)
		oBinding.iCreatedContexts = 7;

		assert.strictEqual(oContext.getModelIndex(), 49);
	});

	//*********************************************************************************************
	QUnit.test("getIndex()", function (assert) {
		var oBinding = {},
			oContext = Context.create(null/*oModel*/, oBinding, "/foo", 42),
			iResult = {/*a number*/};

		this.mock(oContext).expects("getModelIndex").returns(iResult);

		// code under test
		assert.strictEqual(oContext.getIndex(), iResult);

		// simulate ODataListBinding#create (4x at the end)
		oBinding.bCreatedAtEnd = true;
		oBinding.iMaxLength = 6;

		// code under test
		assert.strictEqual(Context.create(null/*oModel*/, oBinding, "/foo", 0).getIndex(), 0);
		assert.strictEqual(Context.create(null/*oModel*/, oBinding, "/foo", 5).getIndex(), 5);
		assert.strictEqual(Context.create(null/*oModel*/, oBinding, "/foo", -1).getIndex(), 6);
		assert.strictEqual(Context.create(null/*oModel*/, oBinding, "/foo", -4).getIndex(), 9);
	});

	//*********************************************************************************************
	QUnit.test("path must be absolute", function (assert) {
		assert.throws(function () {
			Context.create(null, null, "foo");
		}, new Error("Not an absolute path: foo"));

		assert.throws(function () {
			Context.createReturnValueContext(null, null, "foo");
		}, new Error("Not an absolute path: foo"));
	});

	//*********************************************************************************************
	QUnit.test("path must not contain trailing slash", function (assert) {
		assert.throws(function () {
			Context.create(null, null, "/");
		}, new Error("Unsupported trailing slash: /"));
		assert.throws(function () {
			Context.create(null, null, "/foo/");
		}, new Error("Unsupported trailing slash: /foo/"));

		assert.throws(function () {
			Context.createReturnValueContext(null, null, "/");
		}, new Error("Unsupported trailing slash: /"));
		assert.throws(function () {
			Context.createReturnValueContext(null, null, "/foo/");
		}, new Error("Unsupported trailing slash: /foo/"));
	});

	//*********************************************************************************************
	QUnit.test("toString", function (assert) {
		var oContext,
			fnResolve;

		assert.strictEqual(Context.create(/*oModel=*/{}, /*oBinding=*/{}, "/Employees").toString(),
			"/Employees");
		assert.strictEqual(Context.create({}, {}, "/Employees", 5).toString(), "/Employees[5]");
		oContext = Context.create({}, {}, "/Employees", -1,
			new Promise(function (resolve) {
				fnResolve = resolve;
			}));
		assert.strictEqual(oContext.toString(), "/Employees[-1|transient]");

		fnResolve();
		return oContext.created().then(function () {
			assert.strictEqual(oContext.toString(), "/Employees[-1]");
		});
	});

	//*********************************************************************************************
	[undefined, "bar"].forEach(function (sPath) {
		QUnit.test("fetchValue, relative", function (assert) {
			var bCached = {/*false,true*/},
				oBinding = {
					fetchValue : function () {}
				},
				oContext = Context.create(null, oBinding, "/foo", 42),
				oListener = {},
				oResult = {};

			this.mock(_Helper).expects("buildPath").withExactArgs("/foo", sPath).returns("/~");
			this.mock(oBinding).expects("fetchValue")
				.withExactArgs("/~", sinon.match.same(oListener), sinon.match.same(bCached))
				.returns(oResult);

			assert.strictEqual(oContext.fetchValue(sPath, oListener, bCached), oResult);
		});
	});

	//*********************************************************************************************
	QUnit.test("fetchValue: /bar", function (assert) {
		var bCached = {/*false,true*/},
			oBinding = {
				fetchValue : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo", 42),
			oListener = {},
			oResult = {},
			sPath = "/bar";

		this.mock(oBinding).expects("fetchValue")
			.withExactArgs(sPath, sinon.match.same(oListener), sinon.match.same(bCached))
			.returns(oResult);

		assert.strictEqual(oContext.fetchValue(sPath, oListener, bCached), oResult);
	});

	//*********************************************************************************************
	QUnit.test("fetchValue for a virtual context", function (assert) {
		var oContext = Context.create(null, {}, "/foo/" + Context.VIRTUAL, Context.VIRTUAL),
			oResult;

		// code under test
		oResult = oContext.fetchValue("bar");

		assert.strictEqual(oResult.isFulfilled(), true);
		assert.strictEqual(oResult.getResult(), undefined);
	});

	//*********************************************************************************************
	[
		{aBindingHasPendingChanges : [true], bResult : true},
		{aBindingHasPendingChanges : [false, true], bResult : true},
		{
			aBindingHasPendingChanges : [false, false],
			bUnresolvedBindingHasPendingChanges : true,
			bResult : true
		}, {
			aBindingHasPendingChanges : [false, false],
			bUnresolvedBindingHasPendingChanges : false,
			bResult : false
		}
	].forEach(function (oFixture, i) {
		QUnit.test("hasPendingChanges: " + i, function (assert) {
			var oModel = {
					getDependentBindings : function () {},
					withUnresolvedBindings : function () {}
				},
				oModelMock = this.mock(oModel),
				oBinding0 = {
					hasPendingChanges : function () {}
				},
				oBinding1 = {
					hasPendingChanges : function () {}
				},
				oParentBinding = {},
				sPath = "/EMPLOYEES('42')",
				oContext = Context.create(oModel, oParentBinding, sPath, 13);

			oModelMock.expects("getDependentBindings")
				.withExactArgs(sinon.match.same(oContext))
				.returns([oBinding0, oBinding1]);
			this.mock(oBinding0).expects("hasPendingChanges")
				.withExactArgs()
				.returns(oFixture.aBindingHasPendingChanges[0]);
			this.mock(oBinding1).expects("hasPendingChanges")
				.withExactArgs()
				.exactly(oFixture.aBindingHasPendingChanges[0] ? 0 : 1)
				.returns(oFixture.aBindingHasPendingChanges[1]);
			this.mock(oModel).expects("withUnresolvedBindings")
				.withExactArgs("hasPendingChangesInCaches", "EMPLOYEES('42')")
				.exactly(oFixture.hasOwnProperty("bUnresolvedBindingHasPendingChanges") ? 1 : 0)
				.returns(oFixture.bUnresolvedBindingHasPendingChanges);

			// code under test
			assert.strictEqual(oContext.hasPendingChanges(), oFixture.bResult);
		});
	});

	//*********************************************************************************************
	[false, true].forEach(function (bTransient) {
		QUnit.test("hasPendingChanges: transient context = " + bTransient, function (assert) {
			var oModel = {
					getDependentBindings : function () {},
					withUnresolvedBindings : function () {}
				},
				oContext = Context.create(oModel, {/*oBinding*/}, "/TEAMS", 0);

			this.stub(oContext, "toString"); // called by SinonJS, would call #isTransient :-(
			this.mock(oContext).expects("isTransient").withExactArgs().returns(bTransient);
			this.mock(oModel).expects("getDependentBindings").exactly(bTransient ? 0 : 1)
				.withExactArgs(sinon.match.same(oContext)).returns([]);
			this.mock(oModel).expects("withUnresolvedBindings").exactly(bTransient ? 0 : 1)
				.withExactArgs("hasPendingChangesInCaches", "TEAMS").returns(false);

			// code under test
			assert.strictEqual(oContext.hasPendingChanges(), bTransient);
		});
	});

	//*********************************************************************************************
	QUnit.test("isTransient", function (assert) {
		var oBinding = {},
			oContext = Context.create(null, oBinding, "/foo", 42),
			fnResolve;

		// code under test
		assert.notOk(oContext.isTransient(), "no created Promise -> not transient");

		oContext = Context.create(null, oBinding, "/foo", 42,
			new Promise(function (resolve, reject) {
				fnResolve = resolve;
			}));

		// code under test
		assert.ok(oContext.isTransient(), "unresolved created Promise -> transient");

		fnResolve();
		return oContext.created().then(function () {
			// code under test
			assert.notOk(oContext.isTransient(), "resolved -> not transient");
		});
	});

	//*********************************************************************************************
	QUnit.test("requestObject", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo"),
			oClone = {},
			oData = {},
			oPromise,
			oSyncPromise = SyncPromise.resolve(Promise.resolve(oData));

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar")
			.returns(oSyncPromise);
		this.mock(_Helper).expects("publicClone").withExactArgs(sinon.match.same(oData))
			.returns(oClone);

		// code under test
		oPromise = oContext.requestObject("bar");

		assert.ok(oPromise instanceof Promise);

		return oPromise.then(function (oResult) {
			assert.strictEqual(oResult, oClone);
		});
	});

	//*********************************************************************************************
	QUnit.test("getObject", function (assert) {
		var oCacheData = {},
			oContext = Context.create(null, {/*oBinding*/}, "/foo"),
			oResult = {};

		this.mock(oContext).expects("getValue").withExactArgs("bar")
			.returns(oCacheData);
		this.mock(_Helper).expects("publicClone").withExactArgs(sinon.match.same(oCacheData))
			.returns(oResult);

		// code under test
		assert.strictEqual(oContext.getObject("bar"), oResult);
	});

	//*********************************************************************************************
	QUnit.test("getValue", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo"),
			oData = {};

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(SyncPromise.resolve(oData));

		// code under test
		assert.strictEqual(oContext.getValue("bar"), oData);
	});

	//*********************************************************************************************
	QUnit.test("getValue: unexpected error", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oError = {},
			oModel = {
				reportError : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/foo");

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(SyncPromise.reject(oError));
		this.mock(oModel).expects("reportError").withExactArgs("Unexpected error",
			"sap.ui.model.odata.v4.Context", sinon.match.same(oError));

		// code under test
		assert.strictEqual(oContext.getValue("bar"), undefined);
	});

	//*********************************************************************************************
	QUnit.test("getValue: not found in cache", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oError = new Error("Unexpected request: GET /foo/bar"),
			oModel = {
				reportError : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/foo");

		oError.$cached = true;
		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(SyncPromise.reject(oError));
		this.mock(oModel).expects("reportError").never();

		// code under test
		assert.strictEqual(oContext.getValue("bar"), undefined);
	});

	//*********************************************************************************************
	QUnit.test("getValue: unresolved", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo");

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(SyncPromise.resolve(Promise.resolve(42)));

		//code under test
		assert.strictEqual(oContext.getValue("bar"), undefined);
	});

	//*********************************************************************************************
	[42, null].forEach(function (vResult) {
		QUnit.test("getProperty: primitive result " + vResult, function (assert) {
			var oBinding = {
					checkSuspended : function () {}
				},
				oContext = Context.create(null, oBinding, "/foo"),
				oSyncPromise = SyncPromise.resolve(vResult);

			this.mock(oBinding).expects("checkSuspended").withExactArgs();
			this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
				.returns(oSyncPromise);

			//code under test
			assert.strictEqual(oContext.getProperty("bar"), vResult);
		});
	});

	//*********************************************************************************************
	QUnit.test("getProperty: structured result", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo", 1),
			oSyncPromise = SyncPromise.resolve({});

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("getPath").withExactArgs("bar").returns("~");
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(oSyncPromise);

		//code under test
		assert.throws(function () {
			oContext.getProperty("bar");
		}, new Error("Accessed value is not primitive: ~"));
	});

	//*********************************************************************************************
	QUnit.test("getProperty: unresolved", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo"),
			oSyncPromise = SyncPromise.resolve(Promise.resolve(42));

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(oSyncPromise);

		//code under test
		assert.strictEqual(oContext.getProperty("bar"), undefined);
	});

	//*********************************************************************************************
	QUnit.test("getProperty: not found in cache", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oError = new Error("Unexpected request: GET /foo/bar"),
			oContext = Context.create(null, oBinding, "/foo");

		oError.$cached = true;
		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(SyncPromise.reject(oError));

		// code under test
		assert.strictEqual(oContext.getProperty("bar"), undefined);
	});

	//*********************************************************************************************
	QUnit.test("getProperty: rejected", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo"),
			sMessage = "read error",
			oPromise = Promise.reject(new Error(sMessage)),
			oSyncPromise = SyncPromise.resolve(oPromise);

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
			.returns(oSyncPromise);
		this.oLogMock.expects("warning")
			.withExactArgs(sMessage, "bar", "sap.ui.model.odata.v4.Context");

		return oPromise.catch(function () {
			//code under test
			assert.strictEqual(oContext.getProperty("bar"), undefined);
		});
	});

	//*********************************************************************************************
	[true, false].forEach(function (bTypeIsResolved) {
		QUnit.test("getProperty: external, bTypeIsResolved=" + bTypeIsResolved, function (assert) {
			var oBinding = {
					checkSuspended : function () {}
				},
				oMetaModel = {
					fetchUI5Type : function () {}
				},
				oModel = {
					getMetaModel : function () {
						return oMetaModel;
					}
				},
				oContext = Context.create(oModel, oBinding, "/foo", 42),
				oType = {
					formatValue : function () {}
				},
				oResolvedType = bTypeIsResolved ? oType : Promise.resolve(oType),
				oSyncPromiseType = SyncPromise.resolve(oResolvedType),
				oSyncPromiseValue = SyncPromise.resolve(1234);

			this.mock(oBinding).expects("checkSuspended").withExactArgs();
			this.mock(oContext).expects("getPath").withExactArgs("bar").returns("~");
			this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, true)
				.returns(oSyncPromiseValue);
			this.mock(oMetaModel).expects("fetchUI5Type").withExactArgs("~")
				.returns(oSyncPromiseType);
			if (bTypeIsResolved) {
				this.mock(oType).expects("formatValue").withExactArgs(1234, "string")
					.returns("1,234");
			}

			//code under test
			assert.strictEqual(oContext.getProperty("bar", true),
				bTypeIsResolved ? "1,234" : undefined);
		});
	});

	//*********************************************************************************************
	[42, null].forEach(function (vResult) {
		QUnit.test("requestProperty: primitive result " + vResult, function (assert) {
			var oBinding = {
					checkSuspended : function () {}
				},
				oContext = Context.create(null, oBinding, "/foo"),
				oSyncPromise = SyncPromise.resolve(Promise.resolve(vResult));

			this.mock(oBinding).expects("checkSuspended").withExactArgs();
			this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, undefined)
				.returns(oSyncPromise);

			//code under test
			return oContext.requestProperty("bar").then(function (vActual) {
				assert.strictEqual(vActual, vResult);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("requestProperty: structured result", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oContext = Context.create(null, oBinding, "/foo", 1),
			oSyncPromise = SyncPromise.resolve(Promise.resolve({}));

		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, undefined)
			.returns(oSyncPromise);

		//code under test
		return oContext.requestProperty("bar").then(function () {
			assert.ok(false);
		}, function (oError) {
			assert.strictEqual(oError.message, "Accessed value is not primitive: /foo/bar");
		});
	});

	//*********************************************************************************************
	QUnit.test("requestProperty: external", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oMetaModel = {
				fetchUI5Type : function () {}
			},
			oModel = {
				getMetaModel : function () {
					return oMetaModel;
				}
			},
			oType = {
				formatValue : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/foo", 42),
			oSyncPromiseType = SyncPromise.resolve(Promise.resolve(oType)),
			oSyncPromiseValue = SyncPromise.resolve(1234);

		this.mock(oContext).expects("fetchValue").withExactArgs("bar", null, undefined)
			.returns(oSyncPromiseValue);
		this.mock(oMetaModel).expects("fetchUI5Type").withExactArgs("/foo/bar")
			.returns(oSyncPromiseType);
		this.mock(oType).expects("formatValue").withExactArgs(1234, "string")
			.returns("1,234");

		//code under test
		return oContext.requestProperty("bar", true).then(function (oResult) {
			assert.strictEqual(oResult, "1,234");
		});
	});

	//*********************************************************************************************
	QUnit.test("fetchCanonicalPath", function (assert) {
		var oMetaModel = {
				fetchCanonicalPath : function () {}
			},
			oModel = {
				getMetaModel : function () {
					return oMetaModel;
				}
			},
			oContext = Context.create(oModel, null, "/EMPLOYEES/42"),
			oPromise = {};

		this.mock(oMetaModel).expects("fetchCanonicalPath")
			.withExactArgs(sinon.match.same(oContext))
			.returns(oPromise);

		// code under test
		assert.strictEqual(oContext.fetchCanonicalPath(), oPromise);
	});

	//*********************************************************************************************
	QUnit.test("requestCanonicalPath", function (assert) {
		var oContext = Context.create(null, null, "/EMPLOYEES/42"),
			oPromise,
			oSyncPromise = SyncPromise.resolve(Promise.resolve("/EMPLOYEES('1')"));

		this.mock(oContext).expects("fetchCanonicalPath").withExactArgs().returns(oSyncPromise);

		//code under test
		oPromise = oContext.requestCanonicalPath();

		assert.ok(oPromise instanceof Promise);

		return oPromise.then(function (oResult) {
			assert.deepEqual(oResult, "/EMPLOYEES('1')");
		});
	});

	//*********************************************************************************************
	QUnit.test("getCanonicalPath: success", function (assert) {
		var oContext = Context.create(null, null, "/EMPLOYEES/42"),
			oSyncPromise = SyncPromise.resolve("/EMPLOYEES('1')");

		this.mock(oContext).expects("fetchCanonicalPath").withExactArgs().returns(oSyncPromise);

		//code under test
		assert.strictEqual(oContext.getCanonicalPath(), "/EMPLOYEES('1')");
	});

	//*********************************************************************************************
	QUnit.test("getCanonicalPath: unresolved", function (assert) {
		var oContext = Context.create(null, null, "/EMPLOYEES/42"),
			oSyncPromise = SyncPromise.resolve(Promise.resolve("/EMPLOYEES('1')"));

		this.mock(oContext).expects("fetchCanonicalPath").withExactArgs().returns(oSyncPromise);

		//code under test
		assert.throws(function () {
			oContext.getCanonicalPath();
		}, new Error("Result pending"));
	});

	//*********************************************************************************************
	QUnit.test("getCanonicalPath: failure", function (assert) {
		var oContext = Context.create(null, null, "/EMPLOYEES/42"),
			oError = new Error("Intentionally failed"),
			oSyncPromise = SyncPromise.resolve().then(function () {throw oError;});

		this.mock(oContext).expects("fetchCanonicalPath").withExactArgs().returns(oSyncPromise);

		//code under test
		assert.throws(function () {
			oContext.getCanonicalPath();
		}, oError);
	});

	//*********************************************************************************************
	QUnit.test("getQueryOptionsForPath: delegation to parent binding", function (assert) {
		var oBinding = {
				getQueryOptionsForPath : function () {}
			},
			oContext = Context.create(null, oBinding, "/EMPLOYEES/42"),
			sPath = "any/path",
			mResult = {};

		this.mock(oBinding).expects("getQueryOptionsForPath").withExactArgs(sPath).returns(mResult);

		// code under test
		assert.strictEqual(oContext.getQueryOptionsForPath(sPath), mResult);
	});

	//*********************************************************************************************
	QUnit.test("getGroupId", function (assert) {
		var oBinding = {
				getGroupId : function () {}
			},
			oContext = Context.create(null, oBinding, "/EMPLOYEES/42"),
			sResult = "myGroup";

		this.mock(oBinding).expects("getGroupId").withExactArgs().returns(sResult);

		// code under test
		assert.strictEqual(oContext.getGroupId(), sResult);
	});

	//*********************************************************************************************
	QUnit.test("getUpdateGroupId", function (assert) {
		var oBinding = {
				getUpdateGroupId : function () {}
			},
			oContext = Context.create(null, oBinding, "/EMPLOYEES/42"),
			sResult = "myGroup";

		this.mock(oBinding).expects("getUpdateGroupId").withExactArgs().returns(sResult);

		// code under test
		assert.strictEqual(oContext.getUpdateGroupId(), sResult);
	});

	//*********************************************************************************************
	[false, true].forEach(function (bFailure) {
		QUnit.test("delete: " + (bFailure ? "failure" : "success"), function (assert) {
			var oBinding = {
					checkSuspended : function () {}
				},
				oGroupLock = new _GroupLock(),
				oModel = {
					checkGroupId : function () {},
					lockGroup : function () {},
					reportError : function () {}
				},
				oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42),
				oError = new Error();

			this.mock(oBinding).expects("checkSuspended").withExactArgs();
			this.mock(oModel).expects("checkGroupId").withExactArgs("myGroup");
			this.mock(oContext).expects("isTransient").withExactArgs()
				// check before deletion and twice while reporting the error
				.exactly(bFailure ? 3 : 1)
				.returns(true);
			this.mock(oModel).expects("lockGroup").withExactArgs("myGroup", true, oContext)
				.returns(oGroupLock);
			this.mock(oContext).expects("_delete").withExactArgs(sinon.match.same(oGroupLock))
				.returns(bFailure ? Promise.reject(oError) : Promise.resolve());
			if (bFailure) {
				this.mock(oGroupLock).expects("unlock").withExactArgs(true);
				this.mock(oModel).expects("reportError")
					.withExactArgs("Failed to delete " + oContext, "sap.ui.model.odata.v4.Context",
						oError);
			}

			// code under test
			return oContext.delete("myGroup").then(function () {
				assert.notOk(bFailure);
			}, function (oError0) {
				assert.ok(bFailure);
				assert.strictEqual(oError0, oError);
			});
		});
	});

	//*********************************************************************************************
	QUnit.test("delete: error in checkGroupId and checkSuspended", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oBindingMock = this.mock(oBinding),
			sGroupId = "$invalid",
			oModel = {
				checkGroupId : function () {}
			},
			oModelMock = this.mock(oModel),
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42),
			oError0 = new Error("invalid group"),
			oError1 = new Error("suspended");

		oModelMock.expects("checkGroupId").withExactArgs(sGroupId).throws(oError0);
		oBindingMock.expects("checkSuspended").never();

		assert.throws(function () {
			oContext.delete(sGroupId);
		}, oError0);

		oModelMock.expects("checkGroupId").withExactArgs("$auto");
		oBindingMock.expects("checkSuspended").withExactArgs().throws(oError1);

		assert.throws(function () {
			oContext.delete("$auto");
		}, oError1);
	});

	//*********************************************************************************************
	QUnit.test("delete: pending changes", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			sGroupId = "$auto",
			oModel = {
				checkGroupId : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42);

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oModel).expects("checkGroupId").withExactArgs(sGroupId);
		this.mock(oContext).expects("isTransient").withExactArgs().returns(false);
		this.mock(oContext).expects("hasPendingChanges").withExactArgs().returns(true);

		assert.throws(function () {
			oContext.delete(sGroupId);
		}, new Error("Cannot delete due to pending changes"));
	});

	//*********************************************************************************************
	QUnit.test("_delete: success", function (assert) {
		var oBinding = {
				_delete : function () {}
			},
			oGroupLock = {},
			oModel = {},
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42);

		this.mock(oContext).expects("fetchCanonicalPath")
			.withExactArgs().returns(SyncPromise.resolve("/EMPLOYEES('1')"));
		this.mock(oBinding).expects("_delete")
			.withExactArgs(sinon.match.same(oGroupLock), "EMPLOYEES('1')",
				sinon.match.same(oContext))
			.returns(Promise.resolve());

		// code under test
		return oContext._delete(oGroupLock).then(function (oResult) {
			assert.strictEqual(oResult, undefined);
			assert.strictEqual(oContext.oBinding, oBinding);
			assert.strictEqual(oContext.oModel, oModel);
		});
	});

	//*********************************************************************************************
	QUnit.test("_delete: transient", function (assert) {
		var oBinding = {
				_delete : function () {}
			},
			oGroupLock = {},
			oModel = {},
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES($uid=id-1-23)", -1,
				new Promise(function () {}));

		this.mock(oBinding).expects("_delete")
			.withExactArgs(sinon.match.same(oGroupLock), "n/a", sinon.match.same(oContext))
			.returns(Promise.resolve());

		// code under test
		return oContext._delete(oGroupLock).then(function (oResult) {
			assert.strictEqual(oResult, undefined);
			assert.strictEqual(oContext.oBinding, oBinding);
			assert.strictEqual(oContext.oModel, oModel);
		});
	});

	//*********************************************************************************************
	QUnit.test("_delete: failure", function (assert) {
		var oBinding = {
				_delete : function () {}
			},
			oError = new Error(),
			oGroupLock = {},
			oModel = {
				reportError : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42);

		this.mock(oContext).expects("fetchCanonicalPath")
			.withExactArgs().returns(SyncPromise.resolve("/EMPLOYEES('1')"));
		this.mock(oBinding).expects("_delete")
			.withExactArgs(sinon.match.same(oGroupLock), "EMPLOYEES('1')",
				sinon.match.same(oContext))
			.returns(Promise.reject(oError));

		// code under test
		return oContext._delete(oGroupLock).then(function () {
			assert.ok(false);
		}, function (oError0) {
			assert.strictEqual(oError0, oError);
			assert.strictEqual(oContext.getBinding(), oBinding);
			assert.strictEqual(oContext.getModelIndex(), 42);
			assert.strictEqual(oContext.getModel(), oModel);
			assert.strictEqual(oContext.getPath(), "/EMPLOYEES/42");
		});
	});

	//*********************************************************************************************
	QUnit.test("_delete: failure in fetchCanonicalPath", function (assert) {
		var oBinding = {},
			oError = new Error(),
			oModel = {
				reportError : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42);

		this.mock(oContext).expects("fetchCanonicalPath")
			.withExactArgs().returns(SyncPromise.reject(oError));

		// code under test
		return oContext._delete({}).then(function () {
			assert.ok(false);
		}, function (oError0) {
			assert.strictEqual(oError0, oError);
		});
	});

	//*********************************************************************************************
	QUnit.test("destroy", function (assert) {
		var oModel = {
				getDependentBindings : function () {}
			},
			oBinding1 = {
				setContext : function () {}
			},
			oBinding2 = {
				setContext : function () {}
			},
			oParentBinding = {},
			oContext = Context.create(oModel, oParentBinding, "/EMPLOYEES/42", 42);

		this.mock(oModel).expects("getDependentBindings")
			.withExactArgs(sinon.match.same(oContext))
			.returns([oBinding1, oBinding2]);
		this.mock(oBinding1).expects("setContext").withExactArgs(undefined);
		this.mock(oBinding2).expects("setContext").withExactArgs(undefined);
		this.mock(BaseContext.prototype).expects("destroy").on(oContext).withExactArgs();

		// code under test
		oContext.destroy();

		assert.strictEqual(oContext.oBinding, undefined);
		assert.strictEqual(oContext.oModel, undefined);
	});

	//*********************************************************************************************
	QUnit.test("checkUpdate", function (assert) {
		var oModel = {
				getDependentBindings : function () {}
			},
			bBinding1Updated = false,
			oBinding1 = {
				checkUpdate : function () {
					return new SyncPromise(function (resolve) {
						setTimeout(function () {
							bBinding1Updated = true;
							resolve();
						});
					});
				}
			},
			bBinding2Updated = false,
			oBinding2 = {
				checkUpdate : function () {
					return new SyncPromise(function (resolve) {
						setTimeout(function () {
							bBinding2Updated = true;
							resolve();
						});
					});
				}
			},
			oParentBinding = {},
			oPromise,
			oContext = Context.create(oModel, oParentBinding, "/EMPLOYEES/42", 42);

		this.mock(oModel).expects("getDependentBindings")
			.withExactArgs(sinon.match.same(oContext))
			.returns([oBinding1, oBinding2]);

		// code under test
		oPromise = oContext.checkUpdate();

		assert.strictEqual(oPromise.isFulfilled(), false);
		return oPromise.then(function () {
			assert.strictEqual(bBinding1Updated, true);
			assert.strictEqual(bBinding2Updated, true);
		});
	});

	//*********************************************************************************************
	QUnit.test("refresh, list binding", function (assert) {
		var bAllowRemoval = {/*false, true, undefined*/},
			oBinding = {
				checkSuspended : function () {},
				getContext : function () { return null; },
				isRelative : function () { return false; },
				refresh : function () {},
				refreshSingle : function () {}
			},
			oBindingMock = this.mock(oBinding),
			oGroupLock = {},
			oModel = {
				checkGroupId : function () {},
				lockGroup : function () {},
				withUnresolvedBindings : function () {}
			},
			oModelMock = this.mock(oModel),
			oContext = Context.create(oModel, oBinding, "/EMPLOYEES/42", 42);

		oModelMock.expects("checkGroupId");
		oModelMock.expects("lockGroup").withExactArgs("myGroup", true, oContext)
			.returns(oGroupLock);
		oBindingMock.expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("hasPendingChanges").withExactArgs().returns(false);
		oBindingMock.expects("refresh").never();
		oBindingMock.expects("refreshSingle")
			.withExactArgs(sinon.match.same(oContext), sinon.match.same(oGroupLock),
				sinon.match.same(bAllowRemoval));
		oModelMock.expects("withUnresolvedBindings")
			.withExactArgs("removeCachesAndMessages", "EMPLOYEES/42");

		// code under test
		oContext.refresh("myGroup", bAllowRemoval);
	});

	//*********************************************************************************************
	[false, true].forEach(function (bReturnValueContext) {
		QUnit.test("refresh, context binding, " + bReturnValueContext, function (assert) {
			var oBinding = {
					checkSuspended : function () {},
					getContext : function () { return {}; },
					isRelative : function () { return false; },
					refresh : function () {},
					refreshReturnValueContext : function () {}
				},
				oBindingMock = this.mock(oBinding),
				oModel = {
					checkGroupId : function () {},
					withUnresolvedBindings : function () {}
				},
				oModelMock = this.mock(oModel),
				oContext =  Context.create(oModel, oBinding, "/EMPLOYEES('42')"),
				oContextMock = this.mock(oContext);

			oModelMock.expects("checkGroupId").withExactArgs("myGroup");
			oBindingMock.expects("checkSuspended").withExactArgs();
			oContextMock.expects("hasPendingChanges").withExactArgs().returns(false);
			oBindingMock.expects("refreshReturnValueContext")
				.withExactArgs(sinon.match.same(oContext), "myGroup")
				.returns(bReturnValueContext);
			oBindingMock.expects("refresh").withExactArgs("myGroup")
				.exactly(bReturnValueContext ? 0 : 1);
			oModelMock.expects("withUnresolvedBindings")
				.withExactArgs("removeCachesAndMessages", "EMPLOYEES('42')");

			// code under test
			oContext.refresh("myGroup");

			oModelMock.expects("checkGroupId").withExactArgs("myGroup");
			oBindingMock.expects("checkSuspended").withExactArgs();
			oContextMock.expects("hasPendingChanges").withExactArgs().returns(false);

			assert.throws(function () {
				// code under test
				oContext.refresh("myGroup", undefined);
			}, new Error("Unsupported parameter bAllowRemoval: undefined"));
		});
	});

	//*********************************************************************************************
	QUnit.test("refresh, error handling: invalid group", function (assert) {
		var oBinding = {},
			oError = new Error(),
			sGroupId = "$foo",
			oModel = {
				checkGroupId : function () {}
			};

		this.mock(oModel).expects("checkGroupId").withExactArgs(sGroupId).throws(oError);

		assert.throws(function () {
			// code under test
			Context.create(oModel, oBinding, "/EMPLOYEES", 42).refresh(sGroupId);
		}, oError);
	});

	//*********************************************************************************************
	QUnit.test("refresh, error handling: has pending changes", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			sGroupId = "myGroup",
			oModel = {
				checkGroupId : function () {}
			},
			oContext =  Context.create(oModel, oBinding, "/EMPLOYEES('42')");

		this.mock(oModel).expects("checkGroupId").withExactArgs(sGroupId);
		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("hasPendingChanges").withExactArgs().returns(true);

		assert.throws(function () {
			// code under test
			oContext.refresh(sGroupId);
		}, new Error("Cannot refresh entity due to pending changes: /EMPLOYEES('42')"));
	});

	//*********************************************************************************************
	QUnit.test("withCache: absolute path", function (assert) {
		var oBinding = {
				withCache : function () {}
			},
			fnCallback = {},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')", 42),
			oResult = {};

		this.mock(oBinding).expects("withCache")
			.withExactArgs(sinon.match.same(fnCallback), "/foo").returns(oResult);

		assert.strictEqual(oContext.withCache(fnCallback, "/foo"), oResult);
	});

	//*********************************************************************************************
	QUnit.test("withCache: relative path", function (assert) {
		var oBinding = {
				withCache : function () {}
			},
			fnCallback = {},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')", 42),
			oResult = {};

		this.mock(_Helper).expects("buildPath").withExactArgs("/EMPLOYEES('42')", "foo")
			.returns("~");
		this.mock(oBinding).expects("withCache")
			.withExactArgs(sinon.match.same(fnCallback), "~").returns(oResult);

		assert.strictEqual(oContext.withCache(fnCallback, "foo"), oResult);
	});

	//*********************************************************************************************
	QUnit.test("withCache: virtual context", function (assert) {
		var oBinding = {},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES/" + Context.VIRTUAL,
				Context.VIRTUAL),
			oResult;

		this.mock(_Helper).expects("buildPath").never();

		// code under test
		oResult = oContext.withCache();

		assert.strictEqual(oResult.isFulfilled(), true);
		assert.strictEqual(oResult.getResult(), undefined);
	});

	//*********************************************************************************************
	QUnit.test("patch", function (assert) {
		var oCache = {
				patch : function () {}
			},
			oContext = Context.create({/*oModel*/}, {/*oBinding*/}, "/EMPLOYEES('42')"),
			oData = {},
			sPath = "path/to/context";

		this.mock(oContext).expects("withCache").withExactArgs(sinon.match.func, "")
			.callsArgWith(0, oCache, sPath)
			.returns(Promise.resolve());
		this.mock(oCache).expects("patch").withExactArgs(sPath, sinon.match.same(oData));

		// code under test
		return oContext.patch(oData);
	});

	//*********************************************************************************************
	QUnit.test("requestSideEffects", function (assert) {
		var oCache = {
				// currently used to detect a context binding
				requestSideEffects : function () {}
			},
			oBinding = {
				oCachePromise : SyncPromise.resolve(oCache),
				oContext : {},
				checkSuspended : function () {},
				bRelative : true,
				requestSideEffects : function () {}
			},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')"),
			sUpdateGroupId = "update";

		assert.throws(function () {
			// code under test
			oContext.requestSideEffects();
		}, new Error("Missing edm:(Navigation)PropertyPath expressions"));

		assert.throws(function () {
			// code under test
			oContext.requestSideEffects([]);
		}, new Error("Missing edm:(Navigation)PropertyPath expressions"));

		[
			undefined,
			"foo",
			{},
			{$AnnotationPath : "foo"},
			{$If : [true, {$PropertyPath : "TEAM_ID"}]}, // "a near miss" ;-)
			{$PropertyPath : ""}
		].forEach(function (oPath) {
			var sJSON = JSON.stringify(oPath);

			assert.throws(function () {
				// code under test
				oContext.requestSideEffects([oPath]);
			}, new Error("Not an edm:(Navigation)PropertyPath expression: " + sJSON), sJSON);
		});

		this.mock(oContext).expects("getUpdateGroupId").withExactArgs().returns(sUpdateGroupId);
		this.mock(oBinding).expects("requestSideEffects")
			// Note: $select not yet sorted
			.withExactArgs(sUpdateGroupId, ["TEAM_ID", "EMPLOYEE_2_MANAGER", "ROOM_ID", ""],
				sinon.match.same(oContext))
			.returns(SyncPromise.resolve({}));

		// code under test
		return oContext.requestSideEffects([{
				$PropertyPath : "TEAM_ID"
			}, {
				$NavigationPropertyPath : "EMPLOYEE_2_MANAGER"
			}, {
				$PropertyPath : "ROOM_ID"
			}, {
				$NavigationPropertyPath : ""
			}]).then(function (oResult) {
				assert.strictEqual(oResult, undefined);
			});
	});

	//*********************************************************************************************
	QUnit.test("requestSideEffects: suspended binding", function (assert) {
		var oBinding = {
				oCachePromise : SyncPromise.resolve({/*oCache*/}),
				checkSuspended : function () {}
			},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')"),
			oError = new Error("Must not call...");

		this.mock(oBinding).expects("checkSuspended").withExactArgs().throws(oError);

		assert.throws(function () {
			// code under test
			oContext.requestSideEffects();
		}, oError);
	});

	//*********************************************************************************************
	QUnit.test("requestSideEffects: promise rejected", function (assert) {
		var oCache = {
				// currently used to detect a context binding
				requestSideEffects : function () {}
			},
			oBinding = {
				oCachePromise : SyncPromise.resolve(oCache),
				checkSuspended : function () {},
				requestSideEffects : function () {}
			},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')"),
			oError = new Error("Failed intentionally"),
			oResult,
			sUpdateGroupId = "update";

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oContext).expects("getUpdateGroupId").withExactArgs().returns(sUpdateGroupId);
		this.mock(oBinding).expects("requestSideEffects")
			.withExactArgs(sUpdateGroupId, ["TEAM_ID"], sinon.match.same(oContext))
			.returns(SyncPromise.reject(oError));

		// code under test
		oResult = oContext.requestSideEffects([{$PropertyPath : "TEAM_ID"}]);

		assert.ok(oResult instanceof Promise);

		return oResult.then(function () {
				assert.ok(false, "unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
	});

	//*********************************************************************************************
	QUnit.test("requestSideEffects: no own cache", function (assert) {
		var oBinding = {
				oCachePromise : SyncPromise.resolve(),
				checkSuspended : function () {}
			},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')");

		assert.throws(function () {
			// code under test
			oContext.requestSideEffects();
		}, new Error("Unsupported context: " + oContext));
	});

	//*********************************************************************************************
	QUnit.test("requestSideEffects: error on transient context", function (assert) {
		var oBinding = {
				oCachePromise : SyncPromise.resolve({/*no requestSideEffects*/}),
				checkSuspended : function () {}
			},
			oContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES('42')");

		this.mock(oContext).expects("isTransient").withExactArgs().returns(true);

		assert.throws(function () {
			// code under test
			oContext.requestSideEffects();
		}, new Error("Unsupported context: " + oContext));
	});

	//*********************************************************************************************
	// Test error when requestSideEffects is called on a (header) context which was stored before
	// the binding becomes unresolved.
	QUnit.test("requestSideEffects: error on unresolved binding", function (assert) {
		var oBinding = {
				oCachePromise : SyncPromise.resolve({/*no requestSideEffects*/}),
				checkSuspended : function () {},
				bRelative : true
			},
			oHeaderContext = Context.create({/*oModel*/}, oBinding, "/EMPLOYEES");

		assert.throws(function () {
			// code under test
			oHeaderContext.requestSideEffects([{$PropertyPath : "TEAM_ID"}]);
		}, new Error("Cannot request side effects of unresolved binding's context: /EMPLOYEES"));
	});

	//*********************************************************************************************
	QUnit.test("doSetProperty: fetchUpdataData fails", function (assert) {
		var oMetaModel = {
				fetchUpdateData : function () {}
			},
			oModel = {
				getMetaModel : function () {
					return oMetaModel;
				}
			},
			oContext = Context.create(oModel, null, "/ProductList('HT-1000')"),
			oError = new Error("This call intentionally failed");

		this.mock(oMetaModel).expects("fetchUpdateData")
			.withExactArgs("some/relative/path", sinon.match.same(oContext))
			.returns(SyncPromise.resolve(Promise.reject(oError)));

		// code under test
		return oContext.doSetProperty("some/relative/path").then(function () {
			assert.ok(false, "Unexpected success");
		}, function (oError0) {
			assert.strictEqual(oError0, oError);
		});
	});

	//*********************************************************************************************
	QUnit.test("doSetProperty: withCache fails", function (assert) {
		var oMetaModel = {
				fetchUpdateData : function () {}
			},
			oModel = {
				getMetaModel : function () {
					return oMetaModel;
				}
			},
			oContext = Context.create(oModel, null, "/ProductList('HT-1000')"),
			oError = new Error("This call intentionally failed");

		this.mock(oMetaModel).expects("fetchUpdateData")
			.withExactArgs("some/relative/path", sinon.match.same(oContext))
			.returns(SyncPromise.resolve({entityPath : "/entity/path"}));
		this.mock(oContext).expects("withCache").withExactArgs(sinon.match.func, "/entity/path")
			.returns(SyncPromise.reject(oError));

		// code under test
		return oContext.doSetProperty("some/relative/path").then(function () {
			assert.ok(false, "Unexpected success");
		}, function (oError0) {
			assert.strictEqual(oError0, oError);
		});
	});

	//*********************************************************************************************
[function (oModelMock, oBinding, oBindingMock, fnErrorCallback, fnPatchSent, oError) {
	return Promise.reject(oError); // #update fails
}, function (oModelMock, oBinding, oBindingMock, fnErrorCallback, fnPatchSent, oError) {
	// simulate a failed PATCH via Context#setProperty
	oBindingMock.expects("firePatchSent").on(oBinding).withExactArgs();

	// code under test: fnPatchSent
	fnPatchSent();

	oBindingMock.expects("firePatchCompleted").on(oBinding).withExactArgs(false);

	return Promise.reject(oError); // #update fails
}, function () {
	// simulate a PATCH for a newly created entity (PATCH is merged into POST -> no events)
	return Promise.resolve("n/a"); // #update succeeds
}, function (oModelMock, oBinding, oBindingMock, fnErrorCallback, fnPatchSent) {
	// simulate repeating a patch if first request failed
	var oError = new Error("500 Internal Server Error");

	oBindingMock.expects("firePatchSent").on(oBinding).withExactArgs();

	// code under test: fnPatchSent
	fnPatchSent();

	oModelMock.expects("reportError").twice()
		.withExactArgs("Failed to update path /resolved/data/path",
			"sap.ui.model.odata.v4.Context", sinon.match.same(oError));
	oBindingMock.expects("firePatchCompleted").on(oBinding).withExactArgs(false);

	// code under test: simulate retry; call fnErrorCallback and then fnPatchSent
	fnErrorCallback(oError);
	fnErrorCallback(oError); // no patchCompleted event if it is already fired

	oBindingMock.expects("firePatchSent").on(oBinding).withExactArgs();
	fnPatchSent();

	oBindingMock.expects("firePatchCompleted").on(oBinding).withExactArgs(true);

	return Promise.resolve("n/a"); // #update succeeds after retry
}].forEach(function (fnScenario, i) {
	var sTitle = "doSetProperty: scenario " + i;

	QUnit.test(sTitle, function (assert) {
		var oGroupLock = new _GroupLock(),
			oMetaModel = {
				fetchUpdateData : function () {},
				getUnitOrCurrencyPath : function () {}
			},
			oModel = {
				getMetaModel : function () {
					return oMetaModel;
				},
				reportError : function () {},
				resolve : function () {}
			},
			oContext = Context.create(oModel, null, "/BusinessPartnerList('0100000000')"),
			oError = new Error("This call intentionally failed"),
			bSkipRetry = i === 1,
			vWithCacheResult = {},
			that = this;

		this.mock(oMetaModel).expects("fetchUpdateData")
			.withExactArgs("some/relative/path", sinon.match.same(oContext))
			.returns(SyncPromise.resolve({
				editUrl : "/edit/url",
				entityPath : "/entity/path",
				propertyPath : "property/path"
			}));
		this.mock(oContext).expects("withCache").withExactArgs(sinon.match.func, "/entity/path")
			.callsFake(function (fnProcessor) {
				var oBinding = {
						firePatchCompleted : function () {},
						firePatchSent : function () {},
						getUpdateGroupId : function () {},
						isPatchWithoutSideEffects : function () {}
					},
					oBindingMock = that.mock(oBinding),
					oCache = {
						update : function () {}
					},
					bPatchWithoutSideEffects = {/*false,true*/},
					oUpdatePromise;

				oBindingMock.expects("firePatchCompleted").never();
				oBindingMock.expects("firePatchSent").never();
				oBindingMock.expects("getUpdateGroupId").withExactArgs().returns("up");
				oBindingMock.expects("isPatchWithoutSideEffects").withExactArgs()
					.returns(bPatchWithoutSideEffects);
				that.mock(oGroupLock).expects("setGroupId").withExactArgs("up");
				that.mock(oModel).expects("resolve").atLeast(1) // fnErrorCallback also needs it
					.withExactArgs("some/relative/path", sinon.match.same(oContext))
					.returns("/resolved/data/path");
				that.mock(oMetaModel).expects("getUnitOrCurrencyPath")
					.withExactArgs("/resolved/data/path")
					.returns("unit/or/currency/path");
				that.mock(oCache).expects("update")
					.withExactArgs(sinon.match.same(oGroupLock), "property/path", "new value",
						/*fnErrorCallback*/bSkipRetry ? undefined : sinon.match.func, "/edit/url",
						"cache/path", "unit/or/currency/path",
						sinon.match.same(bPatchWithoutSideEffects), /*fnPatchSent*/sinon.match.func)
					.callsFake(function () {
						return SyncPromise.resolve(
							fnScenario(that.mock(oModel), oBinding, oBindingMock,
								/*fnErrorCallback*/arguments[3], /*fnPatchSent*/arguments[8],
								oError));
					});

				// code under test
				oUpdatePromise = fnProcessor(oCache, "cache/path", oBinding);

				assert.strictEqual(oUpdatePromise.isPending(), true);

				return oUpdatePromise.then(function (vResult) {
					if (i > 1) {
						assert.strictEqual(vResult, undefined);
					} else {
						assert.ok(false, "Unexpected success");
					}

					return vWithCacheResult; // allow check that #withCache's result is propagated
				}, function (oError0) {
					assert.ok(i < 2);
					assert.strictEqual(oError0, oError);

					throw oError;
				});
			});

		// code under test
		return oContext.doSetProperty("some/relative/path", "new value", oGroupLock, bSkipRetry)
			.then(function (vResult) {
				if (i > 1) {
					assert.strictEqual(vResult, vWithCacheResult);
				} else {
					assert.ok(false, "Unexpected success");
				}
			}, function (oError0) {
				assert.ok(i < 2);
				assert.strictEqual(oError0, oError);
			});
	});
});

	//*********************************************************************************************
[null, "new value"].forEach(function (vValue) {
	QUnit.test("setProperty: " + vValue, function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oModel = {
				checkGroupId : function () {},
				lockGroup : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/ProductList('HT-1000')"),
			oGroupLock = {},
			vWithCacheResult = {};

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oModel).expects("checkGroupId").withExactArgs("group");
		this.mock(oModel).expects("lockGroup")
			.withExactArgs("group", true)
			.returns(oGroupLock);
		this.mock(oContext).expects("doSetProperty")
			.withExactArgs("some/relative/path", vValue, sinon.match.same(oGroupLock), true)
			.resolves(vWithCacheResult); // allow check that #withCache's result is propagated

		// code under test
		return oContext.setProperty("some/relative/path", vValue, "group").then(function (vResult) {
			assert.strictEqual(vResult, vWithCacheResult);
		});
	});
});

	//*********************************************************************************************
[String, {}].forEach(function (vForbiddenValue) {
	QUnit.test("setProperty: Not a primitive value: " + vForbiddenValue, function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oModel = {
				checkGroupId : function () {},
				lockGroup : function () {},
				reportError : function () {},
				resolve : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/ProductList('HT-1000')"),
			oExpectedError = new Error("Not a primitive value");

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oModel).expects("checkGroupId").withExactArgs("group");
		this.mock(oModel).expects("lockGroup").never();
		this.mock(oModel).expects("reportError").never();
		this.mock(oContext).expects("doSetProperty").never();

		assert.throws(function () {
			// code under test
			oContext.setProperty("some/relative/path", vForbiddenValue, "group");
		}, oExpectedError);
	});
});

	//*********************************************************************************************
	QUnit.test("setProperty: doSetProperty fails, unlock oGroupLock", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oModel = {
				checkGroupId : function () {},
				lockGroup : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/ProductList('HT-1000')"),
			oError = new Error("This call intentionally failed"),
			oGroupLock = {
				unlock : function () {}
			},
			oGroupLockMock = this.mock(oGroupLock),
			oPromise;

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oModel).expects("checkGroupId").withExactArgs("group");
		this.mock(oModel).expects("lockGroup")
			.withExactArgs("group", true)
			.returns(oGroupLock);
		oGroupLockMock.expects("unlock").never(); // not yet
		this.mock(oContext).expects("doSetProperty")
			.withExactArgs("some/relative/path", "new value", sinon.match.same(oGroupLock), true)
			.rejects(oError);

		// code under test
		oPromise = oContext.setProperty("some/relative/path", "new value", "group");

		oGroupLockMock.expects("unlock").withExactArgs(true);

		return oPromise.then(function () {
				oPromise.ok(false, "unexpected success");
			}, function (oError0) {
				assert.strictEqual(oError0, oError);
			});
	});

	//*********************************************************************************************
	QUnit.test("setProperty: optional update group ID", function (assert) {
		var oBinding = {
				checkSuspended : function () {}
			},
			oModel = {
				checkGroupId : function () {},
				lockGroup : function () {}
			},
			oContext = Context.create(oModel, oBinding, "/ProductList('HT-1000')"),
			oGroupLock = {},
			vWithCacheResult = {};

		this.mock(oBinding).expects("checkSuspended").withExactArgs();
		this.mock(oModel).expects("checkGroupId").withExactArgs(undefined);
		this.mock(oContext).expects("getUpdateGroupId").withExactArgs().returns("group");
		this.mock(oModel).expects("lockGroup")
			.withExactArgs("group", true)
			.returns(oGroupLock);
		this.mock(oContext).expects("doSetProperty")
			.withExactArgs("some/relative/path", "new value", sinon.match.same(oGroupLock), true)
			.resolves(vWithCacheResult); // allow check that #withCache's result is propagated

		// code under test
		return oContext.setProperty("some/relative/path", "new value").then(function (vResult) {
			assert.strictEqual(vResult, vWithCacheResult);
		});
	});
});
