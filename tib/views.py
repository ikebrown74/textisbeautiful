import base64
import hashlib
import json
import os
import urllib
from django.conf import settings
from django.http import HttpResponse, HttpResponseServerError, HttpResponseBadRequest
from django.shortcuts import render
import time
from tib import utils

def result(request):
    """
    This view accepts text and creates a leximancer project for that text.
    """
    if request.method == "POST":
        text = request.POST['text_content']
        if len(text) < 5000 or len(text) > 105000:
            return render(request, 'create.html', {'text_error': True})
        # Unique ID for this search uses current time and the text
        id = hashlib.md5('{0}:{1}'.format(time.time(), text.encode('utf8'))).hexdigest()
        # Write the text to a file (really shouldn't need to do this but oh well).
        doc = "{0}.txt".format(id)
        text_path = os.path.join(settings.TEXT_PATH, doc)
        if not os.path.exists(os.path.dirname(text_path)):
            os.makedirs(os.path.dirname(text_path))
        destination = open(text_path, 'wb+')
        out = text
        if isinstance(out, unicode):
            out = out.encode('ascii', 'ignore')
        destination.write(out)
        destination.close()
        # Create the project
        proj_url = utils.create_lex_project(id, doc).href
        run_id = urllib.quote(base64.urlsafe_b64encode(proj_url))
        return render(request, "result.html", {"id": run_id})
    else:
        return HttpResponseBadRequest("We only accept POST.")

def status(request, id):
    """
    This view reports on the status of a running leximancer project. The id is actually the Leximancer URL base64 encoded.
    """
    url = base64.urlsafe_b64decode(id.encode('ascii'))

    try:
        result = utils.get_project_status(url)
    except utils.ResourceError:
        return HttpResponseServerError("There was a problem with your query, please try again (ERR: Could\'t fetch project).")

    if not result:
        return HttpResponse(json.dumps({"message": 'Creating Leximancer project...', 'progress': 0, 'completed': False}), content_type='text/json')
    elif result[0] == 'MAP':
        concepts, themes, prominence = utils.get_concepts(utils.get_markers(result[3]))
        # We don't want tp keep projects around.
#        utils.delete_project(url)
        return HttpResponse(json.dumps({"message": 'Here come the visualisations...', 'completed': True, 'progress': 100, 'markers': {"concepts": concepts, "themes": themes, "iprom": prominence}}), content_type='text/json')
    else:
        if result[1] == 'error':
            return HttpResponseServerError("Leximancer project failed to run - {0}".format(result[2]))
        else:
            return HttpResponse(json.dumps({"message": "Running stage {0}: {1}".format(result[0], result[2]), 'progress': utils.STATUS_MAP[result[0]], 'completed': False}), content_type='text/json')
