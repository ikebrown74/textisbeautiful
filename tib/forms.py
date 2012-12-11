from django import forms

class ContactForm(forms.Form):
    name = forms.CharField()
    email = forms.EmailField()
    subject = forms.CharField(max_length=100)
    message = forms.CharField()

class FeedbackForm(forms.Form):
    name = forms.CharField(required=False)
    email = forms.EmailField(required=False)
    like = forms.CharField(max_length="5000")
    dislike = forms.CharField(max_length="5000")