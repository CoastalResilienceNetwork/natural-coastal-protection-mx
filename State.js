'use strict';
define([
        'dojo/_base/declare',
        'underscore'
    ],
    function(declare, _) {

        var State = declare(null, {
            constructor: function(data) {
                this.savedState = _.defaults({}, data, {
                    region: 'Quintana Roo',
                    period: 'ANN',
                    layer: 'people',
                    variable: 'PF',
                    scenario: '',
                    coralVisibility: false,
                    geometry: null,
                });
            },

            getState: function() {
                return this.savedState;
            },

            setRegion: function(region) {
                return this.clone({
                    region: region
                });
            },

            getRegion: function() {
                return this.savedState.region;
            },

            setScenario: function(scenario) {
                return this.clone({
                    scenario: scenario
                });
            },

            getScenario: function() {
                return this.savedState.scenario;
            },

            setCustomGeom: function(geometry) {
                return this.clone({
                    geometry: geometry
                });
            },

            getCustomGeom: function() {
                return this.savedState.geometry;
            },

            setPeriod: function(period) {
                return this.clone({
                    period: period
                });
            },

            getPeriod: function() {
                return this.savedState.period;
            },

            setLayer: function(layer) {
                return this.clone({
                    layer: layer
                });
            },

            getLayer: function() {
                return this.savedState.layer;
            },

            setVariable: function(variable) {
                return this.clone({
                    variable: variable
                });
            },

            getVariable: function() {
                return this.savedState.variable;
            },

            setCoralVisibility: function(coralVisibility) {
                return this.clone({
                    coralVisibility: coralVisibility
                });
            },

            getCoralVisibility: function() {
                return this.savedState.coralVisibility;
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
