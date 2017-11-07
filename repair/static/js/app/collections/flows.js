define(["backbone", "app-config"],

  function(Backbone, config) {
  
    var Activities = Backbone.Collection.extend({
      url: function(){
        var url = (this.type == 'activity2activity') ? config.api.activityToActivity:
                  (this.type == 'actor2actor') ? config.api.actorToActor:
                  config.api.groupToGroup;
        return url.format(this.caseStudyId, this.materialId);
      },
      
      initialize: function (options) {
        this.caseStudyId = options.caseStudyId;
        this.materialId = options.materialId;
        this.type = options.type;
      },
      //model: Activity
    });
    
    return Activities;
  }
);