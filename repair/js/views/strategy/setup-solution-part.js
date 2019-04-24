
define(['views/common/baseview', 'underscore', 'collections/gdsecollection',
        'models/gdsemodel', 'app-config', 'utils/utils', 'bootstrap',
        'bootstrap-select'],

function(BaseView, _, GDSECollection, GDSEModel, config, utils){
/**
*
* @author Christoph Franke
* @name module:views/SolutionPartView
* @augments BaseView
*/
var SolutionPartView = BaseView.extend(
    /** @lends module:views/SolutionPartView.prototype */
    {

    /**
    * render setup and workshop view on solutions
    *
    * @param {Object} options
    * @param {HTMLElement} options.el                          element the view will be rendered in
    * @param {string} options.template                         id of the script element containing the underscore template to render this view
    * @param {module:models/CaseStudy} options.caseStudy       the casestudy to add solutions to
    *
    * @constructs
    * @see http://backbonejs.org/#View
    */
    initialize: function(options){
        SolutionPartView.__super__.initialize.apply(this, [options]);
        var _this = this;
        _.bindAll(this, 'toggleNewFlow');

        this.template = options.template;

        this.solutions = options.solutions;

        this.materials = options.materials;
        this.activityGroups = options.activityGroups;
        this.activities = options.activities;
        this.render();
    },

    /*
    * dom events (managed by jquery)
    */
    events: {
    },

    /*
    * render the view
    */
    render: function(){
        var _this = this,
            html = document.getElementById(this.template).innerHTML,
            template = _.template(html);
        this.el.innerHTML = template({});

        this.nameInput = this.el.querySelector('input[name="name"]');
        this.implNewFlowInput = this.el.querySelector('input[name="impl-new-flow"]');
        this.materialSelect = this.el.querySelector('div[name="material"]');
        this.fromSelect = this.el.querySelector('select[name="from"]');
        this.toSelect = this.el.querySelector('select[name="to"]');
        this.spatialSelect = this.el.querySelector('select[name="spatial-application"]');
        this.aInput = this.el.querySelector('input[name="a"]');
        this.bInput = this.el.querySelector('input[name="b"]');

        $(this.fromSelect).selectpicker({size: 10});
        $(this.toSelect).selectpicker({size: 10});
        this.populateActivityFilter(this.fromSelect);
        // ToDo: null allowed for stocks?
        this.populateActivityFilter(this.toSelect);

        this.renderMatFilter(this.materialSelect);

        this.implNewFlowInput.addEventListener('change', this.toggleNewFlow)
        this.setInputs(this.model);
    },

    toggleNewFlow: function(){
        var showTarget = this.implNewFlowInput.checked,
            flowLi = this.el.querySelector('a[href="#solution-flow-tab"]'),
            targetLi = this.el.querySelector('a[href="#target-tab"]');
        flowLi.click();
        targetLi.style.display = (showTarget) ? 'block' :'none';
    },

    setInputs: function(){
        this.nameInput.value = this.model.get('name') || '';
        this.implNewFlowInput.checked = this.model.get('implements_new_flow');
        this.fromSelect.value = this.model.get('implementation_flow_origin_activity') || null;
        this.toSelect.value = this.model.get('implementation_flow_destination_activity') || null;
        var spatial = this.model.get('implementation_flow_spatial_application') || 'both';
        this.spatialSelect.value = spatial.toLowerCase()
        this.aInput.value = this.model.get('a') || 0;
        this.bInput.value = this.model.get('b') || 0;

        // hierarchy-select plugin offers no functions to set (actually no functions at all) -> emulate clicking on row
        var material = this.model.get('implementation_flow_material'),
            li = this.materialSelect.querySelector('li[data-value="' + material + '"]');
        if(li){
            var matItem = li.querySelector('a');
            matItem.click();
        }
        $(this.fromSelect).selectpicker('refresh');
        $(this.toSelect).selectpicker('refresh');
        this.toggleNewFlow();
    },

    applyInputs: function(){
        this.model.set('name', this.nameInput.value);
        this.model.set('implements_new_flow', this.implNewFlowInput.checked);
        this.model.set('implementation_flow_origin_activity', (this.fromSelect.value != "-1") ? this.fromSelect.value: null);
        this.model.set('implementation_flow_destination_activity', (this.toSelect.value != "-1") ? this.toSelect.value: null);
        this.model.set('implementation_flow_material', (this.selectedMaterial) ? this.selectedMaterial.id: null);
        this.model.set('implementation_flow_spatial_application', this.spatialSelect.value);
        this.model.set('new_target_activity', null);
        this.model.set('documentation', '');
        this.model.set('map_request', '');
        this.model.set('a', this.aInput.value);
        this.model.set('b', this.bInput.value);
    },

    populateActivityFilter: function(select){
        var _this = this;
        utils.clearSelect(select);

        var option = document.createElement('option');
        option.value = -1;
        option.text = gettext('Select');
        option.disabled = true;
        select.appendChild(option);
        this.activityGroups.forEach(function(activityGroup){
            var group = document.createElement('optgroup'),
                activities = _this.activities.filterBy({activitygroup: activityGroup.id});
            group.label = activityGroup.get('name');
            activities.forEach(function(activity){
                var option = document.createElement('option');
                option.value = activity.id;
                option.text = activity.get('name');
                group.appendChild(option);
            })
            select.appendChild(group);
        })
        $(select).selectpicker('refresh');
    },

    renderMatFilter: function(el){
        var _this = this;
        this.selectedMaterial = null;
        // select material
        var matSelect = document.createElement('div');
        matSelect.classList.add('materialSelect');
        var select = this.el.querySelector('.hierarchy-select');
        var flowsInChildren = {};
        // count materials in parent, descending level (leafs first)
        this.materials.models.reverse().forEach(function(material){
            var parent = material.get('parent'),
                count = material.get('flow_count') + (flowsInChildren[material.id] || 0);
            flowsInChildren[parent] = (!flowsInChildren[parent]) ? count: flowsInChildren[parent] + count;
        })

        this.matSelect = this.hierarchicalSelect(this.materials, matSelect, {
            onSelect: function(model){
                 _this.selectedMaterial = model;
            },
            defaultOption: gettext('Select'),
            label: function(model, option){
                var compCount = model.get('flow_count'),
                    childCount = flowsInChildren[model.id] || 0,
                    label = model.get('name') + '(' + compCount + ' / ' + childCount + ')';
                return label;
            }
        });

        var matFlowless = this.materials.filterBy({'flow_count': 0});
        // grey out materials not used in any flows in keyflow
        // (do it afterwards, because hierarchical select is build in template)
        matFlowless.forEach(function(material){
            var li = _this.matSelect.querySelector('li[data-value="' + material.id + '"]');
            if (!li) return;
            var a = li.querySelector('a'),
                cls = (flowsInChildren[material.id] > 0) ? 'half': 'empty';
            a.classList.add(cls);
        })
        el.appendChild(matSelect);
    }

});
return SolutionPartView;
}
);