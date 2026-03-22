"use strict";
// ─── Enums ────────────────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemberRole = exports.RsvpStatus = exports.Category = exports.ItemStatus = exports.EventStatus = void 0;
var EventStatus;
(function (EventStatus) {
    EventStatus["Draft"] = "draft";
    EventStatus["Active"] = "active";
    EventStatus["Completed"] = "completed";
    EventStatus["Cancelled"] = "cancelled";
})(EventStatus || (exports.EventStatus = EventStatus = {}));
var ItemStatus;
(function (ItemStatus) {
    ItemStatus["Unclaimed"] = "unclaimed";
    ItemStatus["Claimed"] = "claimed";
})(ItemStatus || (exports.ItemStatus = ItemStatus = {}));
var Category;
(function (Category) {
    Category["Food"] = "Food";
    Category["Drinks"] = "Drinks";
    Category["Equipment"] = "Equipment";
    Category["Decorations"] = "Decorations";
    Category["Games"] = "Games";
    Category["Transport"] = "Transport";
    Category["Logistics"] = "Logistics";
    Category["Tasks"] = "Tasks";
})(Category || (exports.Category = Category = {}));
var RsvpStatus;
(function (RsvpStatus) {
    RsvpStatus["Going"] = "going";
    RsvpStatus["Maybe"] = "maybe";
    RsvpStatus["NotGoing"] = "not_going";
    RsvpStatus["Pending"] = "pending";
})(RsvpStatus || (exports.RsvpStatus = RsvpStatus = {}));
var MemberRole;
(function (MemberRole) {
    MemberRole["Admin"] = "admin";
    MemberRole["Guest"] = "guest";
})(MemberRole || (exports.MemberRole = MemberRole = {}));
