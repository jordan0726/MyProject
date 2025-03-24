# ☁️ Cloud Computing Project - Assignment 1

This is a collaborative cloud-based project developed as part of an in-class assignment for the **Cloud Computing** course.

> **Assignment Specification:**  
Please refer to the file: `COSC2626_2640_2025S1_A1`

---

## 📌 Project Info

- **Language Used**: Python 3.12.4  
- **IDE**: PyCharm  
- **Cloud Platform**: AWS

---

## 🚀 Getting Started for Team member

### 🔑 AWS Credentials Setup

For team members using PyCharm (or any other IDE — as long as you have the **AWS Toolkit plugin** installed):

1. Launch your **AWS Academy Learner Lab** (from Canvas or AWS Educate).
2. In your IDE, open **AWS Toolkit → Edit AWS Credentials File**.
3. Paste your Learner Lab credentials into the file in the following format:

> 🔍 You can find your credentials in the Learner Lab dashboard.  
> For details, refer to **Week 3 Lab instructions**.

```ini
[default]
aws_access_key_id = YOUR_ACCESS_KEY_ID
aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
aws_session_token = YOUR_SESSION_TOKEN

### 📥 Download the following project files:

- `main.py`
- `dynamo_manager.py`
- `s3_manager.py`
- `2025a1.json` (configuration or dataset)

### ▶️ To Run the Program

In terminal:

```bash
python main.py
