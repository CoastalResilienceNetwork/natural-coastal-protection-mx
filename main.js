require({
    // Specify library locations.
    packages: [
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
    "dojo/_base/declare",
    "d3",
    "framework/PluginBase",
    "dojo/i18n!esri/nls/jsapi",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/FeatureLayer",
    "esri/layers/LayerDrawingOptions",
    "esri/symbols/SimpleLineSymbol",
    "esri/Color",
    "esri/toolbars/draw",
    "esri/graphic",
    "esri/geometry/jsonUtils",
    "esri/tasks/QueryTask",
    "esri/tasks/query",
    "./State",
    "dojo/text!./template.html",
    "dojo/text!./data.json",
    "dojo/text!./country-config.json"
    ], function (declare,
              d3,
              PluginBase,
              bundle,
              ArcGISDynamicMapServiceLayer,
              FeatureLayer,
              LayerDrawingOptions,
              SimpleLineSymbol,
              Color,
              Draw,
              Graphic,
              geometryJsonUtils,
              QueryTask,
              Query,
              State,
              templates,
              Data,
              CountryConfig
              ) {
        return declare(PluginBase, {
            toolbarName: "Protección costera natural",
            fullName: "Configure and control layers to be overlayed on the base map.",
			infoGraphic: "plugins/natural_coastal_protection_mx/coastalprotection.jpg",
            resizable: false,
            width: 435,
            showServiceLayersInLegend: true, // Disable the default legend item which doesn't pick up our custom class breaks
            allowIdentifyWhenActive: false,
            drawing: false,
            size:'custom',

            initialize: function(frameworkParameters, currentRegion) {
                declare.safeMixin(this, frameworkParameters);
                this.data = $.parseJSON(Data);
                this.countryConfig = $.parseJSON(CountryConfig);
                this.pluginTmpl = _.template(this.getTemplateById('plugin'));

                this.$el = $(this.container);

                // Translate Built-in ArcGIS Strings
                bundle.toolbars.draw.start = i18next.t("Click to start drawing");
                bundle.toolbars.draw.resume = i18next.t("Click to continue drawing");
                bundle.toolbars.draw.finish = i18next.t("Double click to complete");

                // Default Settings
                this.state = new State();
                this.region = this.state.getRegion();
                this.period = this.state.getPeriod();
                this.layer = this.state.getLayer();
                this.scenario = this.state.getScenario();
                this.variable = this.state.getVariable();
                this.customGeom = this.state.getCustomGeom();
                this.coralVisibility = this.state.getCoralVisibility();

                this.bindEvents();

                this.chart = {};
                this.chart.position = {};
                this.chart.position.margin = {
                    top: 30,
                    right: 30,
                    left: 115,
                    bottom: 30
                };
                this.chart.position.width = (this.width - 10)- this.chart.position.margin.left - this.chart.position.margin.right;
                this.chart.position.height = 235  - this.chart.position.margin.top - this.chart.position.margin.bottom;
                this.selectedUnits = [];

                // Default class breaks and color ramps

                var opacity = 1;

                this.mapClassBreaks = {
                    people: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1.5],
                        [    1,     500,  [26,152,80, opacity], "1 - 500", 3],
                        [  501,    2500,  [145,207,96, opacity], "501 - 2,500", 3],
                        [ 2501,    5000,  [217,239,139, opacity], "2501 - 5,000", 3],
                        [ 5001,   10000,  [254,224,139, opacity], "5001 - 10,000", 3],
                        [10001,   50000,  [252,141,89, opacity], "10,001 - 50,000", 3],
                        [50001,20000000, [215,48,39, opacity], "> 50,000", 3]
                    ],
                    capital: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1],
                        [    0,      75000,  [26,150,65, opacity], "1 - 75", 3],
                        [  75000,      250000,  [166,217,106, opacity], "76 - 250", 3],
                        [ 250000,      750000,  [253,174,97, opacity], "251 - 750", 3],
                        [ 750000,     1000000,  [215,48,39, opacity] , "751 - 1,000", 3],
                        [1000000,   9000000000,  [165,0,38, opacity], "> 1,001", 3]
                    ],
                    area: [
                        [-99999,      0,  [120, 120, 120, opacity], "0", 1],
                        [    1,      5,  [26,150,65, opacity], "1 - 5", 3],
                        [  5,      20,  [166,217,106, opacity], "6 - 20", 3],
                        [ 20,      50,  [253,174,97, opacity], "21 - 50", 3],
                        [ 50,     100,  [215,48,39, opacity], "51 - 100", 3],
                        [100,   100000,  [165,0,38, opacity], "> 100", 3]
                    ],

                };

                this.layers = {
                    'Natural_Coastal_Protection_Final': 0,
                    'Global Coral Reef Habitat': 1,
                    'Annual Present People Protected': 2,
                    'Annual Low CC 2030 People Protected': 3,
                    'Annual High CC 2030 People Protected': 4,
                    'Annual Low CC 2050 People Protected': 5,
                    'Annual High CC 2050 People Protected': 6,
                    '100 RP Present People Protected': 7,
                    '100 RP Low CC 2030 People Protected': 8,
                    '100 RP High CC 2030 People Protected': 9,
                    '100 RP Low CC 2050 People Protected': 10,
                    '100 RP High CC 2050 People Protected': 11,
                    'Annual Present Built Capital Protected': 12,
                    'Annual Low CC 2030 Built Capital Protected': 13,
                    'Annual High CC 2030 Built Capital Protected': 14,
                    'Annual Low CC 2050 Built Capital Protected': 15,
                    'Annual High CC 2050 Built Capital Protected': 16,
                    '100 RP Present Built Capital Protected': 17,
                    '100 RP Low CC 2030 Built Capital Protected': 18,
                    '100 RP High CC 2030 Built Capital Protected': 19,
                    '100 RP Low CC 2050 Built Capital Protected': 20,
                    '100 RP High CC 2050 Built Capital Protected': 21,
                    'Annual Present Hotels Protected': 22,
                    'Annual Low CC 2030 Hotels Protected': 23,
                    'Annual High CC 2030 Hotels Protected': 24,
                    'Annual Low CC 2050 Hotels Protected': 25,
                    'Annual High CC 2050 Hotels Protected': 26,
                    '100 RP Present Hotels Protected': 27,
                    '100 RP Low CC 2030 Hotels Protected': 28,
                    '100 RP High CC 2030 Hotels Protected': 29,
                    '100 RP Low CC 2050 Hotels Protected': 30,
                    '100 RP High CC 2050 Hotels Protected': 31
                };
            },

            setState: function(data) {
                this.state = new State(data);
                this.region = data.region;
                this.customGeom = data.customGeom;
                this.period = data.period;
                this.layer = data.layer;
                this.variable = data.variable;
                this.scenario = data.scenario;
                this.coralVisibility = data.coralVisibility;
            },

            getState: function() {
                return {
                    region: this.state.getRegion(),
                    customGeom: this.state.getCustomGeom(),
                    period: this.state.getPeriod(),
                    layer: this.state.getLayer(),
                    variable: this.state.getVariable(),
                    scenario: this.state.getScenario(),
                    coralVisibility: this.state.getCoralVisibility()
                };
            },

            layerStringBuilder: function() {
                var period = "",
                    scenario = "",
                    variable = "",
                    layerString = "";

                if (this.period === 'ANN') {
                    period = 'Annual';
                } else if (this.period ==="100RP") {
                    period = '100 RP';
                }

                if (this.scenario === "L2030") {
                    scenario = "Low CC 2030";
                } else if (this.scenario === "H2030") {
                    scenario = "High CC 2030";
                } else if (this.scenario === "L2050") {
                    scenario = "Low CC 2050";
                } else if (this.scenario === "H2050") {
                    scenario = "High CC 2050";
                } else {
                    scenario = "Present";
                }

                if (this.variable === "PF") {
                    variable = "People Protected";
                } else if (this.variable === "BCF") {
                    variable = "Built Capital Protected";
                } else if (this.variable === "HOTEL") {
                    variable = "Hotels Protected";
                }

                layerString = period + " " + scenario + " " + variable;

                return this.layers[layerString];

            },

            bindEvents: function() {
                var self = this;

                // Set event listeners.  We bind "this" where needed so the event handler can access the full
                // scope of the plugin
                this.$el.on("change", "input[name=storm" + this.app.paneNumber + "]", $.proxy(this.changeGroupSelect, this));
                this.$el.on("change", "input[type=radio]", $.proxy(this.getParameters, this));
                this.$el.on("change", "#ncpmx-select-region", $.proxy(this.changeRegion, this));
                this.$el.on("click", ".stat", function(e) {self.changeScenarioClick(e);});
                this.$el.on("click", ".draw-button", $.proxy(this.drawCustomRegion, this));
                this.$el.on("change", ".coral-select-container input", $.proxy(this.toggleCoral, this));

                this.$el.on("click", ".js-getSnapshot", $.proxy(this.printReport, this));
            },

            getLayersJson: function() {
                return layerSourcesJson;
            },

            // This function loads the first time the plugin is opened, or after the plugin has been closed (not minimized).
            // It sets up the layers with their default settings

            firstLoad: function() {
                var self = this;
                var layerDefs = [];
                var layerDrawingOptions = [];
                var layerDrawingOption = new LayerDrawingOptions();

                this.coralReefLayer = new ArcGISDynamicMapServiceLayer("https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {
                    visible: this.state.getCoralVisibility(),
                    opacity: 0.5
                });
                this.coralReefLayer.setVisibleLayers([32]);

                this.coastalProtectionLayer = new ArcGISDynamicMapServiceLayer("https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer", {});
                this.coastalProtectionLayer.setVisibleLayers([0]);
                this.coastalProtectionFeatureLayer = new FeatureLayer("https://services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Natural_Coastal_Protection/MapServer/3");

                this.coastalProtectionLayer.setLayerDrawingOptions(layerDrawingOptions);
                this.map.addLayer(this.coastalProtectionLayer);
                this.map.addLayer(this.coralReefLayer);

                this.draw = new Draw(this.map);
                this.draw.on("draw-complete", function(evt) {
                    self.state = self.state.setCustomGeom(evt.geometry.toJson());
                    self.drawCustom(evt.geometry);
                });

            },

            // This function runs everytime the plugin is open.  If the plugin was previously minimized, it restores the plugin
            // to it's previous state
            activate: function() {
                var self = this;
                
                this.render();
                this.renderChart();

                // If the plugin hasn't been opened, or if it was closed (not-minimized) run the firstLoad function and reset the
                // default variables
                if (!this.coastalProtectionLayer || !this.coastalProtectionLayer.visible) {
                    this.firstLoad();
                }

                // Restore storm period radios
                this.$el.find("input[value=" + this.period + "]").prop('checked', true);
                this.changeGroupSelect();
                if (this.period === "ANN") {
                    this.$el.find(".select-ann input[value=" + this.scenario + "]").prop('checked', true);
                } else {
                    this.$el.find(".select-100 input[value=" + this.scenario + "]").prop('checked', true);
                }

                // restore state of people, capital, area selector
                this.$el.find(".stat.active").removeClass("active");
                this.$el.find("." + this.layer + ".stat").addClass("active");

                // Restore state of region select
                this.$el.find("#ncpmx-select-region").val(this.region).trigger('chosen:updated');
                if (this.region === "custom") {
                    this.drawCustom(geometryJsonUtils.fromJson(this.customGeom));
                }

                // Restore state of coral reef checkbox
                if (this.coralReefLayer.visible) {
                    this.$el.find(".coral-select-container input").prop("checked", true);
                }

                this.changeRegion();

                this.$el.find('.info-tooltip').tooltip({
                    tooltipClass: "plugin-tooltip",
                    track: true,
                });

            },

            drawCustom: function(geom) {
                var self = this;
                this.drawing = false;
                this.$el.find(".draw-button").removeClass("active");
                this.$el.find(".region-select-container .styled-select").removeClass("disabled");
                this.draw.deactivate();
                
                var symbol = new SimpleLineSymbol();
                var graphic = new Graphic(geom, symbol);
                var query = new Query();
                query.spatialRelationship = Query.SPATIAL_REL_INTERSECTS;
                query.returnGeometry = false;
                query.outFields = ["UNIT_ID"];
                query.geometry = geom;
                this.map.graphics.add(graphic);
                this.coastalProtectionFeatureLayer.queryFeatures(query, function(featureset) {
                    self.selectedUnits = _(featureset.features).map(function(feature) {
                        return feature.attributes.UNIT_ID;
                    });
                    // TODO Probably set to new custom select value
                    self.$el.find("#ncpmx-select-region").val("custom").trigger('chosen:updated');
                    self.changeRegion();
                });
            },

            // Turn the coral reef layer on and off
            toggleCoral: function() {
                if ($(".coral-select-container input").is(":checked")) {
                    this.coralReefLayer.setVisibility(true);
                    this.state = this.state.setCoralVisibility(true);
                } else {
                    this.coralReefLayer.setVisibility();
                    this.state = this.state.setCoralVisibility(false);
                }
            },

            updateLayers: function() {
                var layerDefs = [];
                var layerIdx = this.layerStringBuilder();
                // Set the data extent
                if (this.region === "Quintana Roo" || this.region === "draw") {
                    layerDefs[layerIdx] = "";
                } else if (this.region === "custom") {
                    var definitions = [];
                    _.each(this.selectedUnits, function(unit) {
                        definitions.push("UNIT_ID=" + unit);
                    });
                    layerDefs[layerIdx] = definitions.join(" or ");
                } else {
                    layerDefs[layerIdx] = "REGION='" + this.region + "'";
                }

                this.state = this.state.setRegion(this.region);
                
                this.coastalProtectionLayer.setLayerDefinitions(layerDefs);
                this.coastalProtectionLayer.setVisibleLayers([this.layerStringBuilder()]);
            },

            getParameters: function () {
                this.region = this.$el.find("#ncpmx-select-region").val();
                this.period = this.$el.find("input[name=storm" + this.app.paneNumber + "]:checked").val();
                this.scenario = this.$el.find("input[name=climate-scenario" + this.app.paneNumber + "]:checked").val();
                this.layer = this.$el.find(".stat.active").closest(".stat").data("layer");

                if (this.layer === "people") {
                    this.variable = "PF";
                } else if (this.layer === "capital") {
                    this.variable = "BCF";
                } else if (this.layer === "area") {
                    this.variable = "HOTEL";
                }

                this.state = this.state.setRegion(this.region);
                this.state = this.state.setPeriod(this.period);
                this.state = this.state.setLayer(this.layer);
                this.state = this.state.setVariable(this.variable);
                this.state = this.state.setScenario(this.scenario);

                this.updateStats();
                this.updateChart();
                this.updateLayers();

            },

            changeGroupSelect: function(e) {
                this.$el.find("input[name=storm" + this.app.paneNumber + "]:checked").closest(".expected-benefit").find(".slider-select").removeClass("disabled");
                this.$el.find("input[name=storm" + this.app.paneNumber + "]:checked").closest(".expected-benefit").find("input[name=climate-scenario" + this.app.paneNumber + "]").first().prop("checked", true);
                this.$el.find("input[name=storm" + this.app.paneNumber + "]").not(":checked").closest(".expected-benefit").find(".slider-select").addClass("disabled");
            },

            updateStats: function() {
                var scenarioLabel;

                if (this.scenario !== '') {
                    scenarioLabel = "_" + this.scenario;
                } else {
                    scenarioLabel = "";
                }

                this.$el.find(".stat.people .number .variable").html(this.numberWithCommas(Math.round(this.getRegionSum("E2E1_DIF_" + this.period + "_PF" + scenarioLabel, this.region))));
                this.$el.find(".stat.capital .number .variable").html(this.getRegionSum("E2E1_DIF_" + this.period + "_BCF" + scenarioLabel, this.region).toFixed(2));
                this.$el.find(".stat.area .number .variable").html((this.getRegionSum("E2E1_DIF_" + this.period + "_HOTEL" + scenarioLabel, this.region) / 1000000).toFixed(2));
            },

            // format a number with commas
            numberWithCommas: function (number) {
                return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            },

            // Change the default region.  If global, zoom to the full extent and show data for all countries.  If regional,
            // zoom to the country based on the bookmark in the extent-bookmarks.json file and hide data for all other countries
            changeRegion: function() {
                this.getParameters();
                // Show/hide the download country summary button
                if (this.region === "Quintana Roo") {
                    this.$el.find(".js-getSnapshot").show();
                } else if (this.region === "custom") {
                    this.$el.find(".js-getSnapshot").hide();
                    ga('send', 'event', {
                        eventCategory: 'NCP-MX',
                        eventAction: 'change region',
                        eventLabel: 'custom'
                    });
                    return;
                } else {
                    this.$el.find(".js-getSnapshot").hide();
                }

                this.map.graphics.clear();

                var regionExtent = this.countryConfig[this.region].EXTENT;

                var extent = new esri.geometry.Extent(regionExtent[0],regionExtent[1],regionExtent[2],regionExtent[3]);

                this.map.setExtent(extent, true);

                ga('send', 'event', {
                    eventCategory: 'NCP-MX',
                    eventAction: 'change region',
                    eventLabel: this.region
                });
            },

            drawCustomRegion: function() {
                if (this.drawing) {
                    this.drawing = false;
                    this.$el.find(".region-select-container .styled-select").removeClass("disabled");
                    this.$el.find(".draw-button").removeClass("active");
                    this.map.graphics.clear();
                    this.draw.deactivate();
                } else {
                    this.drawing = true;
                    this.$el.find(".region-select-container .styled-select").addClass("disabled");
                    this.$el.find(".draw-button").addClass("active");
                    
                    // Reset to global data
                    this.region = "Quintana Roo";
                    this.state = this.state.setRegion(this.region);
                    this.$el.find("#ncpmx-select-region").val(this.region).trigger('chosen:updated');
                    this.updateLayers();

                    this.map.graphics.clear();
                    this.draw.activate(Draw.POLYGON);
                }
            },

            // Capture the click from the fact number click events and pass to the changeScenario function
            changeScenarioClick: function(e) {
                this.$el.find(".stat.active").removeClass("active");
                $(e.currentTarget).closest(".stat").addClass("active");

                this.getParameters();
            },

            // Render the plugin DOM
            render: function() {
                var $el = $(this.pluginTmpl({
                    global: this.data["Quintana Roo"],
                    regions: _(this.data).chain().map(function(segment) {return segment.REGION;}).uniq().value(),
                    pane: this.app.paneNumber
                }));

                $(this.container).empty().append($el);

                this.$el.find('#ncpmx-select-region').chosen({
                    disable_search_threshold: 20,
                    width: '175px'
                });

                this.$el.find('.i18n').localize();
            },

            getRegionSum: function(attribute, region) {
                var self = this;
                // Return the summed attribute for the specified region
                if (region && region !== "Quintana Roo" && region !== "custom") {
                    return _(this.data).chain().where({REGION: region}).reduce(function(num, segment) {
                        return parseFloat(segment[attribute]) + num;
                    }, 0).value();
                } else if (region && region === "custom") {
                    return _(this.data).reduce(function(num, segment) {
                        if (_.contains(self.selectedUnits, segment.UNIT_ID) ) {
                            return parseFloat(segment[attribute]) + num;
                        }
                        return 0 + num;
                    }, 0);
                } else {
                    // Otherwise, return the global sum
                    return _(this.data).reduce(function(num, segment) {
                        return parseFloat(segment[attribute]) + num;
                    }, 0);
                }

            },

            // Draw the custom legend based on our custom class breaks and the current visibility of each layer
            updateLegend: function () {
                var html = "";

                if (this.coralReefLayer.visible) {
                    html += "<span style='background: rgb(29,29,114)' class='legend-item coastal-reef'></span>Coral Reef Habitats<br><br>";
                }

                if (this.coastalProtectionLayer.visible) {
                    if (this.layer === "people") {
                        html += i18next.t("People Protected (No.)") + "<br>";
                    } else if (this.layer === "capital") {
                        html += i18next.t("Built Capital Protected ($Millions)") + "<br>";
                    } else if (this.layer === "area") {
                        html += i18next.t("Area Protected (sq km)") + "<br>";
                    }

                    _.each(this.mapClassBreaks[this.layer], function (classbreak) {
                        html += "<span style='background: rgb(";
                        html += classbreak[2][0] + ",";
                        html += classbreak[2][1] + ",";
                        html += classbreak[2][2];
                        html += ")' class='legend-item coastal-protection'></span>";
                        html += classbreak[3] + "<br>";
                    }, this);

                    
                }

                $(this.legendContainer).show().html(html);

                return html;
            },

            // Render the D3 Chart
            renderChart: function() {
                var self = this;

                // The x-axis for the bar chart is also ordinal with two values
                this.chart.barx = d3.scale.ordinal()
                    .domain(["Present", "Reef Loss"])
                    .rangeRoundBands([0, this.chart.position.width], 0.15);

                this.chart.y = d3.scale.linear()
                    .range([this.chart.position.height-20,0]);

                this.chart.barxAxis = d3.svg.axis()
                    .tickFormat(function(d) {
                        return i18next.t(d);
                    })
                    .scale(this.chart.barx)
                    .orient("bottom");

                this.chart.yAxis = d3.svg.axis()
                    .scale(this.chart.y)
                    .orient("left").ticks(5);
                
                var $chartContainer = this.$el.find(".chartContainer");

                this.chart.svg = d3.selectAll($chartContainer.toArray())
                    .append("svg")
                        .attr("width", this.chart.position.width + this.chart.position.margin.left + this.chart.position.margin.right)
                        .attr("height", this.chart.position.height + this.chart.position.margin.top + this.chart.position.margin.bottom)
                    .append("g")
                        .attr("transform", "translate(" + this.chart.position.margin.left + "," + this.chart.position.margin.right + ")");

                // Add a chart background object that can be styled separately
                this.chart.svg.append("rect")
                    .attr("class", "chart-area")
                    .attr("width", this.chart.position.width)
                    .attr("height", this.chart.position.height - 20)
                    .attr("fill", "#f6f6f6");

                // Add the xaxis for the bar chart
                this.chart.svg.append("g")
                    .attr("opacity", 1)
                    .attr("class", "barxaxis")
                    .attr("transform", "translate(0," + (this.chart.position.height-20) + ")")
                    .call(this.chart.barxAxis);

                // Add the y-axis label
                this.chart.svg.append("foreignObject")
                    .attr("class", "yaxis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - this.chart.position.margin.left + 5)
                    .attr("x", 0 - (this.chart.position.height - 10))
                    .attr("width", this.chart.position.height)
                    .attr("text-anchor", "middle")
                    .text(i18next.t('People Protected (No.)'));

                this.chart.svg.append("g")
                    .attr("class", "yaxis")
                    .call(this.chart.yAxis);

                // Initialize chart data 
                this.addChartPoints();
            },

            // Initialize the chart points with empty values
            addChartPoints: function() {
                var self = this;

                // Bar chart
                var bardata = [
                    {x: "Present", y: 0},
                    {x: "Reef Loss", y: 0}
                ];

                this.chart.svg.selectAll(".bar")
                    .data(bardata)
                    .enter().append("rect")
                    .attr("opacity", 0)
                    .attr("class", "bar info-tooltip")
                    .attr("x", function(d) { return self.chart.barx(d.x); })
                    .attr("width", 30)
                    .attr("y", function(d) { return self.chart.y(d.y); });

                this.updateChart();

            },

            // Set the chart data to match the current variable
            updateChart: function() {
                var self = this;

                // Update the  y-axis label to match the current variable selected
                var text = "";
                if (this.variable === "BCF") {
                    text = i18next.t('Built Capital Protected ($Millions)');
                } else if (this.variable === "PF") {
                    text = i18next.t('People Protected (No.)');
                } else if (this.variable === "HOTEL") {
                    text = i18next.t('Hotels Protected ($Millions)');
                }

                this.chart.svg.select(".yaxis-label")
                    .text(text);

                var bary;
                var bary1m;

                if (this.scenario !== '') {
                    scenarioLabel = "_" + this.scenario;
                } else {
                    scenarioLabel = "";
                }

                // Set the data for the bar chart
                if (this.variable === "BCF") {
                    bary = this.getRegionSum("E1_" + this.period + "_BCF" + scenarioLabel, this.region);
                    bary1m = this.getRegionSum("E2_" + this.period + "_BCF" + scenarioLabel, this.region);
                } else if (this.variable === "PF") {
                    bary = this.getRegionSum("E1_" + this.period + "_PF" + scenarioLabel, this.region);
                    bary1m = this.getRegionSum("E2_" + this.period + "_PF" + scenarioLabel, this.region);
                } else if (this.variable === "HOTEL") {
                    bary = this.getRegionSum("E1_" + this.period + "_HOTEL" + scenarioLabel, this.region);
                    bary1m = this.getRegionSum("E2_" + this.period + "_HOTEL" + scenarioLabel, this.region);
                }

                var bardata = [
                    {x: "Present", y: bary},
                    {x: "Reef Loss", y: bary1m}
                ];

                this.chart.y.domain([0, bary1m]);

                // Show and hide as appropriate all the different elements.  We animate these over the course of 1200ms
                this.chart.svg.select(".yaxis")
                    .transition().duration(1200).ease("linear")
                    .call(this.chart.yAxis);

                this.chart.svg.select(".barxaxis")
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", 1);

                this.chart.svg.selectAll(".bar")
                    .data(bardata)
                    .transition().duration(1200).ease("sin-in-out")
                    .attr("opacity", 1)
                    .attr("width", this.chart.barx.rangeBand())
                    .attr("class", function(d) {return "info-tooltip bar " + d.x;})
                    .attr("x", function(d) { return self.chart.barx(d.x); })
                    .attr("y", function(d) { return self.chart.y(d.y); })
                    .attr("height", function(d) { return self.chart.position.height - 20 - self.chart.y(d.y); })
                    .attr('title', function(d) {
                        if (d.y < 10) {
                            return d.y.toFixed(2);
                        } else {
                            return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                        }
                    });
            },

            // Download the pdf report for the current region
            printReport: function() {
                window.open(this.countryConfig[this.region].SNAPSHOT, '_blank'); 
                return false;
            },

            // Get the requested template from the template file based on id.
            // We currently only have one template for this plugin
            getTemplateById: function(id) {
                return $('<div>').append(templates)
                    .find('#' + id)
                    .html().trim();
            },

            deactivate: function() {
                if (this.appDiv !== undefined){
                    if (this.coralReefLayer) {
                        this.map.removeLayer(this.coralReefLayer);
                    }
                    if (this.coastalProtectionLayer) {
                        this.map.removeLayer(this.coastalProtectionLayer);
                    }
                    $(this.legendContainer).hide().html();
                }
            },

            // Turn of the layers when hibernating
            hibernate: function () {
                // Cleanup
                if (this.coralReefLayer) {
                    this.coralReefLayer.hide();
                    this.coastalProtectionLayer.hide();
                }
                $(this.legendContainer).hide().html();
            }

        });
    }
);
