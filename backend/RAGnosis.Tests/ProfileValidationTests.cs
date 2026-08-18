using System.ComponentModel.DataAnnotations;
using RAGnosis.Api.Dtos;
using Xunit;

namespace RAGnosis.Tests;

/// <summary>
/// The browser enforces these same rules for fast feedback, but a caller can post straight to
/// the API and skip the form entirely — so the constraints that actually protect the data are
/// the ones asserted here.
/// </summary>
public class ProfileValidationTests
{
    private static IList<ValidationResult> Validate(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return results;
    }

    private static bool HasErrorFor(object model, string property) =>
        Validate(model).Any(r => r.MemberNames.Contains(property));

    private static RegisterRequest ValidRegistration() => new()
    {
        Name = "Riya Sharma",
        Email = "riya@example.com",
        Password = "sup3rsecret",
        Mobile = "9876543210",
        Age = 30,
        HeightInches = 65,
    };

    [Fact]
    public void A_complete_registration_passes()
    {
        Assert.Empty(Validate(ValidRegistration()));
    }

    [Theory]
    [InlineData("9876543210")]
    [InlineData("6000000000")]
    [InlineData("7123456789")]
    [InlineData("8123456789")]
    public void Mobile_numbers_starting_six_to_nine_are_accepted(string mobile)
    {
        var request = ValidRegistration();
        request.Mobile = mobile;
        Assert.False(HasErrorFor(request, nameof(RegisterRequest.Mobile)));
    }

    [Theory]
    [InlineData("5876543210")]   // starts with 5
    [InlineData("0876543210")]   // starts with 0
    [InlineData("1234567890")]   // starts with 1
    [InlineData("987654321")]    // nine digits
    [InlineData("98765432101")]  // eleven digits
    [InlineData("98765 43210")]  // contains a space
    [InlineData("+919876543210")]// country code
    [InlineData("987654321a")]   // contains a letter
    public void Malformed_mobile_numbers_are_rejected(string mobile)
    {
        var request = ValidRegistration();
        request.Mobile = mobile;
        Assert.True(HasErrorFor(request, nameof(RegisterRequest.Mobile)));
    }

    [Fact]
    public void Mobile_is_optional_on_registration()
    {
        var request = ValidRegistration();
        request.Mobile = null;
        Assert.False(HasErrorFor(request, nameof(RegisterRequest.Mobile)));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(121)]
    public void Ages_outside_a_human_lifespan_are_rejected(int age)
    {
        var request = ValidRegistration();
        request.Age = age;
        Assert.True(HasErrorFor(request, nameof(RegisterRequest.Age)));
    }

    [Theory]
    [InlineData("A+")]
    [InlineData("O-")]
    [InlineData("AB+")]
    public void Recognised_blood_groups_are_accepted(string group)
    {
        var request = ValidRegistration();
        request.BloodGroup = group;
        Assert.False(HasErrorFor(request, nameof(RegisterRequest.BloodGroup)));
    }

    [Theory]
    [InlineData("C+")]
    [InlineData("A")]
    [InlineData("O++")]
    public void Unrecognised_blood_groups_are_rejected(string group)
    {
        var request = ValidRegistration();
        request.BloodGroup = group;
        Assert.True(HasErrorFor(request, nameof(RegisterRequest.BloodGroup)));
    }

    [Theory]
    [InlineData("120/80")]
    [InlineData("90 / 60")]
    public void Blood_pressure_in_systolic_over_diastolic_form_is_accepted(string reading)
    {
        var request = ValidRegistration();
        request.BloodPressure = reading;
        Assert.False(HasErrorFor(request, nameof(RegisterRequest.BloodPressure)));
    }

    [Theory]
    [InlineData("120")]
    [InlineData("120-80")]
    [InlineData("normal")]
    public void Blood_pressure_in_any_other_form_is_rejected(string reading)
    {
        var request = ValidRegistration();
        request.BloodPressure = reading;
        Assert.True(HasErrorFor(request, nameof(RegisterRequest.BloodPressure)));
    }

    // ── Profile updates ──────────────────────────────────────────────────────

    [Fact]
    public void An_update_may_carry_only_the_fields_being_changed()
    {
        Assert.Empty(Validate(new UpdateProfileRequest { Name = "Riya S. Sharma" }));
    }

    [Fact]
    public void An_update_applies_the_same_mobile_rule_as_registration()
    {
        Assert.True(HasErrorFor(new UpdateProfileRequest { Mobile = "1234567890" },
            nameof(UpdateProfileRequest.Mobile)));
    }

    [Fact]
    public void An_empty_string_clears_an_optional_field_rather_than_failing_validation()
    {
        // Null means "leave unchanged", so clearing needs a value that survives validation.
        // RegularExpressionAttribute passes both null and empty, which is what makes the
        // empty string usable as the clear signal; the controller maps it back to null.
        var request = new UpdateProfileRequest { BloodGroup = "", BloodPressure = "" };
        Assert.Empty(Validate(request));
    }

    [Fact]
    public void An_omitted_optional_field_is_treated_the_same_whether_null_or_empty()
    {
        // Registration has nothing to clear, so a blank optional field simply means
        // "not supplied" — it must not be reported as malformed.
        var request = ValidRegistration();
        request.BloodGroup = "";
        request.BloodPressure = "";
        Assert.Empty(Validate(request));
    }
}
