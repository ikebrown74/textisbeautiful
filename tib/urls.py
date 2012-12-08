from django.conf.urls import patterns, include, url
from django.views.generic import TemplateView

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    # url(r'^$', 'tib.views.home', name='home'),
    # url(r'^tib/', include('tib.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),

    # Static views
    url(r'^$', TemplateView.as_view(template_name="index.html"), name="home" ),
    url(r'^about/$', TemplateView.as_view(template_name="about.html"), name="about"),
    url(r'^contact/$', TemplateView.as_view(template_name="contact.html"), name="contact"),
    url(r'^create/$', TemplateView.as_view(template_name="create.html"), name="create"),
    url(r'^faq/$', TemplateView.as_view(template_name="faq.html"), name="faq"),
    url(r'^fb_close/$', TemplateView.as_view(template_name="fb_close.html")),

    # Dynamic views
    url(r'^contact/send/$', 'tib.views.contact_email'),
    url(r'^result/$', 'tib.views.result'),
    url (r'^result/([\w=-]+)/?$', 'tib.views.status'),

    # Blog
    url(r'^blog/', include('zinnia.urls')),
    url(r'^comments/', include('django.contrib.comments.urls')),
)
