from django.http import HttpResponse
from django.template import loader
from django.views.generic import TemplateView
from plotly.offline import iplot
import urllib
import json
from plotly import offline
from plotly.graph_objs import Figure, Data, Layout
from repair.apps.changes.models import CaseStudy
from repair.apps.asmfa.models import Flow

def index(request):
    template = loader.get_template('admin/index.html')

    context = {}
    context['case_studies'] = CaseStudy.objects.order_by('id')
    context['flows'] = Flow.material_choices

    html = template.render(context, request)
    return HttpResponse(html)