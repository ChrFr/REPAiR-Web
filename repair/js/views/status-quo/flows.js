define(['views/baseview', 'underscore', 'visualizations/flowmap',
        'collections/keyflows', 'collections/materials', 
        'collections/actors', 'collections/activitygroups',
        'collections/activities', 'views/flowsankey', 'utils/loader', 'utils/utils',
        'hierarchy-select'],

function(BaseView, _, FlowMap, Keyflows, Materials, Actors, ActivityGroups, 
    Activities, FlowSankeyView, Loader, utils){
/**
*
* @author Christoph Franke
* @name module:views/FlowsView
* @augments module:views/BaseView
*/
var FlowsView = BaseView.extend(
    /** @lends module:views/FlowsView.prototype */
    {

    /**
    * render view to show keyflows in casestudy
    *
    * @param {Object} options
    * @param {HTMLElement} options.el                          element the view will be rendered in
    * @param {string} options.template                         id of the script element containing the underscore template to render this view
    * @param {module:models/CaseStudy} options.caseStudy       the casestudy to add layers to
    *
    * @constructs
    * @see http://backbonejs.org/#View
    */
    initialize: function(options){
        var _this = this;
        _.bindAll(this, 'render');
        _.bindAll(this, 'keyflowChanged');
        _.bindAll(this, 'refreshMap');

        this.template = options.template;
        this.caseStudy = options.caseStudy;
        this.filterParams = null;

        this.keyflows = new Keyflows([], { caseStudyId: this.caseStudy.id });

        this.keyflows.fetch({ success: function(){
            _this.render();
        }})
        
    },

    /*
    * dom events (managed by jquery)
    */
    events: {
        'change select[name="keyflow"]': 'keyflowChanged',
        'change #data-view-type-select': 'renderSankey'
    },

    /*
    * render the view
    */
    render: function(){
        var _this = this;
        var html = document.getElementById(this.template).innerHTML
        var template = _.template(html);
        this.el.innerHTML = template({ keyflows: this.keyflows });
        this.typeSelect = this.el.querySelector('#data-view-type-select');
    },

    refreshMap: function(){
        if (this.sankeyMap) this.sankeyMap.refresh();
    },

    keyflowChanged: function(evt){
        var _this = this;
        this.keyflowId = evt.target.value;
        var content = this.el.querySelector('#flows-setup-content');
        content.style.display = 'inline';
        this.materials = new Materials([], { caseStudyId: this.caseStudy.id, keyflowId: this.keyflowId });
        this.actors = new Actors([], { caseStudyId: this.caseStudy.id, keyflowId: this.keyflowId });
        this.activities = new Activities([], { caseStudyId: this.caseStudy.id, keyflowId: this.keyflowId });
        this.activityGroups = new ActivityGroups([], { caseStudyId: this.caseStudy.id, keyflowId: this.keyflowId });

        var loader = new Loader(this.el, {disable: true});
        var params = { included: 'True' }
        $.when(this.materials.fetch(), this.actors.fetch({ data: params }), 
            this.activities.fetch(), this.activityGroups.fetch()).then(function(){
            _this.renderSankeyMap();
            _this.renderMatFilter();
            _this.renderNodeFilters();
            _this.renderSankey();
            loader.remove();
        })
    },

    renderSankey: function(){
        var type = this.typeSelect.value;
        var collection = (type == 'actor') ? this.actors: 
            (type == 'activity') ? this.activities: 
            this.activityGroups;
        
        var filtered = (type == 'actor') ? this.actorsFiltered: 
            (type == 'activity') ? this.activitiesFiltered: 
            this.activityGroupsFiltered;
        
        // if the collections are filtered build matching query params for the flows
        var filterParams = Object.assign({}, this.filterParams);
        if (filtered){
            var nodeIds = [];
            filtered.forEach(function(node){
                nodeIds.push(node.id);
            })
            if (nodeIds.length > 0) filterParams.nodes = nodeIds;
        }
        
        if (this.flowsView != null) this.flowsView.close();
        this.flowsView = new FlowSankeyView({
            el: document.getElementById('sankey-wrapper'),
            collection: collection,
            materials: this.materials,
            filterParams: filterParams,
            hideUnconnected: true,
            height: 600
        })
    },

    renderSankeyMap: function(){
        var flowMap = new FlowMap("flow-map");
        var collection = this.actors;
        console.log(this.actors);
        flowMap.renderCsv("/static/data/countries.topo.json", "/static/data/nodes.csv", "/static/data/flows.csv");
        
        //function transformNodes(nodes){
            //var transformed = [];
            //nodes.forEach(function(node)){
                //var t = {
                    //city: node.id,
                    
                //};
                //transformed.append()
            //}
        //}
    },

    renderNodeFilters: function(){
        var _this = this;
        function renderOptions(select, collection){
            utils.clearSelect(select);
            option = document.createElement('option');
            option.value = -1; 
            option.text = gettext('All');
            select.appendChild(option);
            collection.forEach(function(model){
                var option = document.createElement('option');
                option.value = model.id;
                option.text = model.get('name');
                select.appendChild(option);
            })
        }
        var groupSelect = this.el.querySelector('select[name="group"]'),
            activitySelect = this.el.querySelector('select[name="activity"]'),
            actorSelect = this.el.querySelector('select[name="actor"]');
            
        renderOptions(groupSelect, this.activityGroups);
        renderOptions(activitySelect, this.activities);
        renderOptions(actorSelect, this.actors);

        groupSelect.addEventListener('change', function(){
            var groupId = groupSelect.value;
            // set and use filters for selected group, set child activities 
            // clear filter if 'All' (== -1) is selected
            _this.activityGroupsFiltered = (groupId < 0) ? null: [_this.activityGroups.get(groupId)];
            _this.activitiesFiltered = (groupId < 0) ? null: _this.activities.filterGroup(groupId);
            _this.actorsFiltered = (groupId < 0) ? null: _this.actors.filterGroup(groupId);
            renderOptions(activitySelect, _this.activitiesFiltered || _this.activities);
            renderOptions(actorSelect, _this.actorsFiltered || _this.actors);
            _this.typeSelect.value = 'activitygroup';
            _this.renderSankey();
        })
        
        activitySelect.addEventListener('change', function(){
            var activityId = activitySelect.value,
                groupId = groupSelect.value;
            // set and use filters for selected activity, set child actors 
            // clear filter if 'All' (== -1) is selected in both group and activity
            if (activityId < 0 && groupId < 0){
                _this.activitiesFiltered = null;
                _this.actorsFiltered = null;
            }
            // 'All' is selected for activity but a specific group is selected
            else if (activityId < 0){
                _this.activitiesFiltered = (groupId < 0) ? null: _this.activities.filterGroup(groupId);
                _this.actorsFiltered = (groupId < 0) ? null: _this.actors.filterGroup(groupId);
            }
            // specific activity is selected
            else {
                _this.activitiesFiltered = [_this.activities.get(activityId)];
                _this.actorsFiltered = _this.actors.filterActivity(activityId);
            }
            renderOptions(actorSelect, _this.actorsFiltered || _this.actors);
            _this.typeSelect.value = 'activity';
            _this.renderSankey();
        })
        
        actorSelect.addEventListener('change', function(){
            var activityId = activitySelect.value,
                groupId = groupSelect.value,
                actorId = actorSelect.value;
            // clear filter if 'All' (== -1) is selected in group, activity and 
            if (groupId < 0 && activityId < 0 && actorId < 0){
                _this.actorsFiltered = null;
            }
            // filter by group if 'All' (== -1) is selected in activity and actor but not group
            if (activityId < 0  && actorId < 0){
                _this.actorsFiltered = (groupId < 0) ? null: _this.actors.filterGroup(groupId);
            }
            // filter by activity if a specific activity is set and 'All' is selected for actor
            else if (actorId < 0){
                _this.actorsFiltered = _this.actors.filterActivity(activityId);
            }
            // specific actor
            else
                _this.actorsFiltered = [_this.actors.get(actorId)]
            _this.typeSelect.value = 'actor'
            _this.renderSankey();
        })
    },

    renderMatFilter: function(){
        var _this = this;
        // select material
        var matSelect = document.createElement('div');
        matSelect.classList.add('materialSelect');
        this.hierarchicalSelect(this.materials, matSelect, {
            onSelect: function(model){
                _this.filterParams = (model) ? { material: model.id } : null;
                _this.renderSankey();
            },
            defaultOption: gettext('All materials')
        });
        this.el.querySelector('#material-filter').appendChild(matSelect);
    }

});
return FlowsView;
}
);