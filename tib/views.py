import base64
import hashlib
import json
import logging
import os
import smtplib
import urllib
import boto
from django.conf import settings
from django.core.mail import mail_admins
from django.core.validators import URLValidator
from django.core.exceptions import ValidationError
from django.http import HttpResponse, HttpResponseServerError, HttpResponseBadRequest
from django.shortcuts import redirect, render
import time
import httplib2

from tib import html2text
from tib import utils
from tib.forms import ContactForm, FeedbackForm

logger = logging.getLogger('tib')

def result(request):
    """
    This view accepts text and creates a leximancer project for that text.
    """
    if request.method == "POST":
        text = None
        if 'text_content' in request.POST:
            # User has submitted their text
            text = request.POST['text_content']
            if len(text) < 5000 or len(text) > 105000:
                return render(request, 'create.html', {'text_error': True})
        else:
            # Wikipedia link
            url = request.POST['wiki_url']
            url = url.replace('https://', 'http://')
            if not url.startswith('http://'):
                url = 'http://' + url

             # Validate URL
            val = URLValidator(verify_exists=False)
            try:
                val(url)
            except ValidationError, e:
                return render(request, 'create.html', {'wiki_error': True})

            if 'wikipedia.org/wiki/' in url:
                resp, content = httplib2.Http().request(url, headers={'User-Agent':'textisbeautiful.net/1.0'})
                text = html2text.html2text(content.decode('utf-8', errors='ignore'))
            else:
                return render(request, 'create.html', {'wiki_error': True})

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
        project_url = result[3]
        (markers_url, markers_cookie) = utils.update_map(project_url)
        concepts, themes, prominence, num_blocks = utils.get_concepts(utils.get_markers(markers_url, markers_cookie))
        # We don't want tp keep projects around.
        utils.delete_project(url)
        return HttpResponse(json.dumps({"message": 'Here come the visualisations...', 'completed': True, 'progress': 100,
                                        'markers': {"concepts": concepts, "themes": themes, "iprom": prominence, "numBlocks" : num_blocks}})
                            , content_type='text/json')
    else:
        if result[1] == 'error':
            return HttpResponseServerError("Leximancer project failed to run - {0}".format(result[2]))
        else:
            return HttpResponse(json.dumps({"message": "Running stage {0}: {1}".format(result[0], result[2]), 'progress': utils.STATUS_MAP[result[0]], 'completed': False}), content_type='text/json')

def contact_email(request):
    """
    Send email to the site admins
    """
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            subject = form.cleaned_data['subject'].encode('ascii', 'ignore')
            message = form.cleaned_data['message'].encode('ascii', 'ignore')
            email = form.cleaned_data['email']
            name = form.cleaned_data['name'].encode('ascii', 'ignore')
            try:
                mail_admins(subject, 'From: {0}\nEmail: {1}\nMessage:\n\n{2}'.format(name, email, message))
                return render(request, "contact.html", {
                    "email_attempt": True,
                    "email_failed": False
                })
            except smtplib.SMTPException as err:
                logger.exception(err)
                return render(request, "contact.html", {
                    "email_attempt": True,
                    "email_failed": True,
                    "message": '(err: sending failed)'
                })
        else:
            return render(request, "contact.html", {
                "email_attempt": True,
                "email_failed": True,
                "message": '(err: form validation)'
            })
    else:
        return redirect('contact')

def feedback(request):
    """
    Send email to the site admins
    """
    if request.method == 'POST':
        form = FeedbackForm(request.POST)
        if form.is_valid():
            like = form.cleaned_data['like']
            dislike = form.cleaned_data['dislike']
            email = form.cleaned_data['email']
            name = form.cleaned_data['name']
            conn = boto.connect_dynamodb(
                aws_access_key_id=settings.AMAZON_KEY_ID,
                aws_secret_access_key=settings.AMAZON_SECRET_KEY
            )
            table = conn.get_table(settings.FEEDBACK_TABLE)
            data = {
                'like': like,
                'dislike': dislike
            }
            if name:
                data['name'] = name
            if email:
                data['email'] = email
            item = table.new_item(
                hash_key='textisbeautiful.net',
                range_key=time.mktime(time.gmtime()),
                attrs=data
            )
            try:
                item.put()
            except StandardError as err:
                logger.exception(err)
                return HttpResponseServerError("Saving feedback failed.")
            return render(request, 'feedback.html', {
                'submitted': True
            })
        else:
            return render(request, "feedback.html", {
                "error": True,
                "message": '(err: form validation)'
            })
    else:
        return render(request, "contact.html", {
            "email_attempt": True,
            "email_failed": True,
            "message": '(err: form validation)'
        })