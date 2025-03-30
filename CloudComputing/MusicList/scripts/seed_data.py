

def generate_dummy_login_data(student_id="s4068959", name="JordanChiou", count=10) -> list:
    """
    According to Assignment Spec - COSC2626_2640_2025S1_A1, generate dummy login data for the login table
    :param student_id: the student id
    :param name: the name of the student
    :param count: the number of dummy data
    :return: a list of dictionaries
    """
    data = []
    for i in range(count):
        email = f"{student_id}{i}@student.rmit.edu.au"
        username = f"{name}{i}"
        password = "".join(str((i+j)%10) for j in range(6))

        data.append({
            "email": email,
            "username": username,
            "password": password
        })

    return data



