const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const { Model } = require("mongoose");
const APIFeatures = require("../utils/apiFeatures");

///////////////// CREATE ////////////////
exports.createOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const doc = await Model.create(request.body);

    if (!doc) {
      return next(new AppError("No document created", 404));
    }

    response.status(201).json({
      status: "success",
      data: doc,
    });
  });

///////////////// READ ////////////////
exports.getOne = (Model, popOptions) =>
  catchAsync(async (request, response, next) => {
    let query = Model.findOne(request.params);
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    response.status(200).json({
      status: "Success",
      data: doc,
    });
  });

exports.getAll = (Model, filterObject) =>
  catchAsync(async (request, response, next) => {
    //EXECUTE QUERY
    if (filterObject == undefined) {
      filterObject = {
        active: {
          $ne: false,
        },
      };
    } else {
      filterObject.active = {
        $ne: false,
      };
    }

    const features = new APIFeatures(Model.find(filterObject), request.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();

    const doc = await features.query;

    response.status(200).json({
      status: "success",
      results: doc.length,
      data: {
        data: doc,
      },
    });
  });

///////////////// UPDATE ////////////////
exports.updateOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const doc = await Model.findOneAndUpdate(request.params, request.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    response.status(200).json({
      status: "success",
      data: {
        data: doc,
      },
    });
  });

///////////////// DELETE ////////////////
exports.deleteOne = (Model) =>
  catchAsync(async (request, response, next) => {
    const doc = await Model.findOneAndDelete(request.params);

    if (!doc) {
      return next(new AppError("No document found with that ID", 404));
    }
    response.status(204).json({
      status: "success",
      data: null,
    });
  });
