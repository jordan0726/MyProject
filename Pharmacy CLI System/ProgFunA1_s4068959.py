
# My name: Jung-De(Jordan) Chiou
# Student ID: s4068959
# The highest part I have attempted: Part3



###### FUNCTION AREA ######
# Menu Function #
def Menu():
    """
    Print Menu and let users select what they want to do.
    Using WhileLoop to repeat menu function after finishing a selected option.
    """
    while True:
        print("#" * 60)
        print("Menu".center(60))
        print("You can choose from the following options:")
        print("1: Make a purchase")
        print("2: Add/Update information of products")
        print("3: Display existing customers")
        print("4: Display existing products")
        print("5: Display a customer order history")
        print("0: Exit the program")
        print("#" * 60)
        user_options = input("Choose one option: ")

        # Check user input valid options
        if user_options == "1":
            Purchase_product()
        elif user_options == "2":
            Update_product_info()
        elif user_options == "3":
            Print_customer_info()
        elif user_options == "4":
            Print_product_info()
        elif user_options == "5":
            Customer_purchase_history()
        elif user_options == "0":
            print("\n" + "-" * 10 + "☞ Exit the program ☜" + "-" * 10 + "\n")
            break #exit the program 
        else:
            print("Please enter options included above.")
         
def Purchase_product():
    """
    If user choose option 1, then this function will be run.
    Let users input their name, purchasing products, quantity and print receipt to them
    """
    print("\n" + "-" * 20 + "Make a purchase" + "-" * 20)
    customer_name = input_cus_name() #customer-name-input function
    input_product_list = input_product() #customer-product-input function
    input_product_list = check_product_prescription(input_product_list) #check whether need prescription
    
    # Check whether the product list still has items after remove unqualified products if customers don't have prescription
    if input_product_list: # if have items in the list
        product_quantity = quantity_input(input_product_list) 
        earned_reward = receipt(customer_name, input_product_list, product_quantity)
        store_cus_data(customer_name, earned_reward)
        print("Your reward is updated!\n ☟ Backing to Menu ☟ \n")
    else: # if the product list is empty
        print("Remember to get a prescription from your doctor!")
        print(" ☟ Backing to Menu ☟ \n")

def Update_product_info():
    """
    Let user add/update product's name, unit price, and doctor prescription
    """

    print("\n" + "-" * 10 + "Add/Update information of products" + "-" * 10)

    # Check the user's input is valid; otherwise, keep asking until valid answers are inputted
    loop_var = True
    while loop_var:
        print("Entering the information of products you want to add or update in valid format as shown below:")
        try:
            input_product_info = input("[Name Price Prescription_Requirement] --> [e.g. toothpaste 5.2 n, apple 3.0 n]\n").strip().split(",")
            clean_list_blank(input_product_info) # clean the blank space between items

            # sperate user's inputs into different catagories to proceed respective validity checking
            product = []
            unit_price = []
            dr_prescription = []
            for item in input_product_info:
                parts = item.split()
                print(parts)
                product.append(parts[0])
                unit_price.append(parts[1])
                dr_prescription.append(parts[2])

        except IndexError: # if users input in wrong format, like apple 4, orange
            print(" ☞ Please re-enter valid answer! ☜\n")
            print("-" * 50)

        else: # if format is valid, then check each input's validity
            invalid_input = [] #if the value is invalid, it will be put into this list
            
            # check whether input prices are invalid, negative or zero
            for validity in unit_price:
                if not check_is_number(validity): # if the input is not float or integer is_number() will reture False and adding it into invalid_input list
                    invalid_input.append(validity) # put the invalid input into invalid_input list
                else:
                    if float(validity) <= 0: #if the input is negative or 0, add it into invalid_input list
                        invalid_input.append(validity)

            # check whether inputs in dr_prescription are valid
            for validity in dr_prescription:
                if not (validity == "y" or validity == "n"):
                    invalid_input.append(validity)
            
            # if having invalid input, print the error message to ask user re-enter valid input
            if invalid_input: 
                invalid_quantity = ", ".join(invalid_input)
                invalid_input_message(invalid_quantity)
            else:  # If all input are valid, adding/updating new product info to Product dictionary database
                loop_var = False # end the loop
                for product_name, product_price, prescription_requirement in zip(product, unit_price, dr_prescription):
                    Product_dict[product_name] = [float(product_price), prescription_requirement]
                print("☝︎ Your products info are successfully added/updated!!! ☝︎ \n☟ Backing to Menu ☟ \n")

def Print_customer_info():
    """
    Print the existing customers' information in Customer_reward dictionary
    """
    print("\n" + "-" * 10 + "Display existing customers" + "-" * 10)
    for name, rewards in Customer_reward.items():
        print(name, rewards)
    print("-" * 46)
    print("☟ Backing to Menu ☟ \n")

def Print_product_info():
    """
    Print the existing products' information in Product_dict dictionary
    """
    print("\n" + "-" * 10 + "Display existing products" + "-" * 10)
    for product, details in Product_dict.items():
        price = details[0]
        dr_prescription = details[1]
        print(f"{product:15}{price:<10.2f}{dr_prescription:15}")
    print("-" * 45)
    print("☟ Backing to Menu ☟ \n")

def Customer_purchase_history():
    """
    According to the input name, print the customer's history purchase records from Customer_history dictionary
    """
    customer_name = input_cus_name() # Let users input the name they want to search
    if customer_name in Customer_history: # Ensure the customer's data has existed in dictionary
        history_records = Customer_history.get(customer_name, []) # Get the customer's all history data (=value) by the customer's name (=key)
        max_product_width = calculate_max_width(history_records) # get the longest width of product strings in that customer's history records
        
        # print title
        print("\n" + "-" * 10 + f"☞ This is the order history of \"{customer_name}\" ☜" + "-" * 10)
        print(("▼ " * 20).center(60))
        print(" ".ljust(10) + "Product".ljust(max_product_width + 5) + "Total Cost".ljust(15) + "Earned Rewards")
       
        # print customer history data #
        for order_num, order_details in enumerate(history_records, start=1): # Get each order records' data and order number
            product_column = [] #prepare a blank list for product column in each order
            for order_product, order_quantity in zip(order_details[0], order_details[1]): # Get detail purchase product and quantity in each order record
                product_column.append(f"{order_quantity} x {order_product}") # add quantity/product pair into list
            print_product_column = ", ".join(product_column) # making all quantity/product pairs become a series string
            total_cost_column = order_details[2] # get total cost info from order record
            rewards_column = order_details[3] # get rewards info from order record
            print(f"{f'order {order_num}':<10}{print_product_column:<{max_product_width + 5}}{total_cost_column:<15.2f}{rewards_column:<10}")
        #print bottom
        print(("▲ " * 20).center(60))

    else:
        print("\n 🥹  Sorry, this customer hasn't had a purchase history yet. 🥹 ")
    
    print("\n☟ Backing to Menu ☟ \n")
    

## Menu_function_1 Details ##
def input_cus_name():
    '''
    Display prompt and let users input customer's name
    '''
    loop_var = True
    while loop_var:
        customer_name = input("Please enter the customer's name [e.g. Jordan]:\n")
        if not customer_name.isalpha(): # if the input contains other than alphabets, the user needs to re-enter
            invalid_input_message() # propmt error message
        else:
            loop_var = False # Input is valid then close the loop 
    return customer_name

def input_product():
    '''
    Display prompt and inputing the product customer bought
    '''
    loop_var = True
    while loop_var:
        input_product_list = input("\nEntering the product name [valid product only, e.g. vitaminC, coldTablet]:\n").strip().split(",")
        
        # Use the function in the "### other small function ###" section below to Clean the space between each product
        input_product_list = clean_list_blank(input_product_list)
        
        # Check whether there is any invalid input product
        invalid_input = [] # If there is any invalid input, they will be put in this list
        for validity in input_product_list:
            if validity not in Product_dict:
                invalid_input.append(validity) # Add invalid inputs into the list

        # Let user re-enter if there is invalid input.
        if invalid_input:
            invalid_product = ", ".join(invalid_input) # Make the invalid input as a series string
            invalid_input_message(invalid_product) # Tell the user what input is invalid
        else:
            loop_var = False
    return input_product_list
    
def quantity_input(input_product_list):
    """
    Let user input the quantity of product and check whether the answer is valid.
    """
    loop_var = True
    while loop_var:
        
        quantity = input("\nEntering the quantity of the product [positive integer only, e.g. 2, 1, 6]:\n").strip().split(",")
        
        # Clean the blank
        clean_list_blank(quantity)
        
        # Turn input quantity into integer to calculate later
        try:
            for list_item in range(len(quantity)): 
                quantity[list_item] = int(quantity[list_item])

        except ValueError: # if users put invalid format like 2 2, would need to re-enter
            print(" ☞ Please re-enter valid quantity! ☜\n")
            print("-" * 50)

        else:
            # Check the input are all postive integer
            invalid_input = []
            for validity in quantity:
                if not str(validity).isnumeric():
                    invalid_input.append(validity)
                else:
                    if int(validity) == 0:
                        invalid_input.append(validity)
            
            # Let user re-enter if there is invalid input.
            if invalid_input:
                invalid_quantity = ", ".join(invalid_input)
                invalid_input_message(invalid_quantity)
            
            # Check the number of quantity matches the number of input products
            if len(input_product_list) != len(quantity):
                print("----- ☝︎ The number of quantity does not match the number of products. ☝︎ -----\n\n----- ☟ Please re-enter the quantity ☟ -----")
            else:
                loop_var = False

    return quantity

def check_product_prescription(input_product_list):
    """
    Go through products the user inputted to check whether they need doctor prescriptions and ask them whether they have or not.
    """
    need_prescription = [] # The products need prescription will be put in this list

    # Check what input products need prescription
    for product_in_list in input_product_list:
        if Product_dict[product_in_list][1] == 'y': # Check the product database to see whether the product needs prescription
            need_prescription.append(product_in_list) #If needed, put it into need_prescription list

    # Check user whether they have doctor's prescription
    if need_prescription: # If there is any product needs prescription, prompt the query
        loop_var = True
        while loop_var:
            # Tell users what products need prescriptions.
            need_prescription_txt = ", ".join(need_prescription) 
            prescription_answer = input(f"\nThe product \"{need_prescription_txt}\" need doctor's prescription, do you have one? (please answer 'n' or 'y')\n")
            # Check customers' answer to see whether they can buy the prescription-needed products.
            if prescription_answer == "n":
                print(f"Sorry, {need_prescription_txt} can’t be purchased without prescription.")
                loop_var = False
                for items in need_prescription:
                    input_product_list.remove(items) #remove items that cannot be purchased
            elif prescription_answer == "y": # If have prescription, ending the loop to proceed
                loop_var = False
            else:
                print("Please enter valid answer('n' or 'y')") # if they answer other than y or n, asking them to re-enter
    return input_product_list

def receipt(customer_name, input_product_list, product_quantity):
    """
    Base on the input of customer's name, product and quantity, print out the total cost and reward to user
    After print out receipt, the system will update the new rewards and record this order history
    """
    
    #print receipt title
    print("-"*60)
    print("Receipt".center(60))
    print("-"*60)
    print("Name:".ljust(15) + f"{customer_name}")

    # print every product's info
    total_cost = 0
    for product, quantity in zip(input_product_list, product_quantity): #combine product list and quantity list to print them respetively.
        unit_price = Product_dict[product][0] # Go to product dictionary to get the product's unit price
        item_total = unit_price * quantity # Calculate this item's cost
        total_cost += item_total # Accumulate every item's cost to get the total cost of this purchase
        print("Product:".ljust(15) + f"{product}")
        print("Unit Price:".ljust(15) + f"{unit_price:.2f} (AUD)")
        print("Quantity:".ljust(15) + f"{quantity}")
    print("-"*60)

    # Deduct total cost by rewards
    final_total_cost = total_cost # Store the original total cost 
    if customer_name in Customer_reward: # Check whether database have customer's data, avoiding error
        # if have reward data and rewards > 100, deduct 10$ from the final total cost
        # Using 'final_total_cost >= 10' is to avoid some situations that customers have large amount of rewards and make little purchase,
        # so that the final_total_cost won't become negative number
        while Customer_reward[customer_name] > 100 and final_total_cost >= 10: 
            Customer_reward[customer_name] -= 100
            final_total_cost -= 10
    print("Total cost:".ljust(15) + f"{final_total_cost:.2f} (AUD)")

    # calculate and print rewards
    earned_reward = round(total_cost)
    print("Earned reward:".ljust(15) + f"{earned_reward}")
    print("-"*60)

    # store purchase history data
    purchase_record = [input_product_list, product_quantity, final_total_cost, earned_reward] # Make this time's purchase data as a list
    if customer_name not in Customer_history: # if no history data in Customer_history dictionary, creating a key/value pair for this customer to store the purchase record
        Customer_history[customer_name] = []
    Customer_history[customer_name].append(purchase_record) # Add the record to history dictionary
    
    return earned_reward #return rewards data to proceed the next step, updating customers' current reward points.

def store_cus_data(customer_name, earned_reward):
    """
    After purchase, adding/updating customers' rewards in Customer_rewrad dictionary
    """
    if customer_name not in Customer_reward: # If no existing data of the customer, creating a new key/value pair for it
        Customer_reward.update({customer_name: earned_reward})
    elif customer_name in Customer_reward:
        Customer_reward[customer_name] += earned_reward # increment the customer's current rewards data


### Other small function ###
def invalid_input_message(item = "your input"):
    '''
    If there is invalid input, prompting error message
    '''
    print(f"----- ☝︎ Sorry, the input \"{item}\" above is not valid ☝︎ -----\n\n----- ☟ Please re-enter valid answer ☟ -----")

def clean_list_blank(input_list):
    '''
    Clean the spare space around items in inputted list
    '''
    for list_item in range(len(input_list)): 
            input_list[list_item] = input_list[list_item].strip()
    return input_list

def check_is_number(test_input):
    '''
    Check whether the input are number (float or integer)
    '''
    try:
        float(test_input)
        return True
    except ValueError:
        return False

def calculate_max_width(history_records):
    '''
    Get the max width in product list to adjust the print width of history records
    It should only takes input from the format like Customer_history dictionary to correctly function
    '''
    max_product_width = 0

    # Finding the max product width in all the customer's history order
    for cus_ord_record in history_records: # Extract [order1], [order2]... from the value in dictionary
        
        product_width = [] # Contain the values which will be printed out in customer history function

        #cus_ord_record[0] will be the list of products the customer brought, cus_ord_record[1] will be the list of quantity
        for product_in_ord, quan_in_ord in zip(cus_ord_record[0], cus_ord_record[1]): 
            product_width.append(f"{quan_in_ord} x {product_in_ord}") # Make them as the format that we will print out in customer history function

        print_product_cwodth = ", ".join(product_width) # Join them to to calculate the total width that will be printed out in theproduct column, like "1 x vitaminC, 2 x vaccine"
        max_product_width = max(max_product_width, len(print_product_cwodth)) # calculate the strings width and store the max one

    return max_product_width # return the max width number in the product column to automatically adjust the space of that column when printing out

####### Customers and Products' database #######
Customer_reward = {"Kate":20, "Tom":32}
Customer_history = {}
Product_dict = {"vitaminC":[12.0, 'n'], "vitaminE":[14.5, 'n'], "coldTablet":[6.4, 'n'], "vaccine":[32.6, 'y'], "fragrance":[25.0, 'n']}

###### Run code area ######
print("\nWelcome to the RMIT Pharmacy!\n")
Menu()




# 📆 Dairy  #
'''
4/8
    I started by simply listing all the requirements step-by-step, then gradually organized them to see which sections were redundant and could be structured into functions.
    I faced several challenges when organizing the receipt() function. The first was setting function variables to access previously entered customer's name and product. 
    I experimented multiple times with this functionality because I was still unfamiliar with defining parameters within a function.
    The second challenge was related to the earned_reward variable being incorporated within the function. Consequently, I couldn't find the function in the "Update the customer's data" section. 
    After some research online, I found that I could use return to pass the value of earned_reward from the function and capture it with the same variable name outside. 
    Since the print functionality was also inside the function, I was able to print the receipt as usual.

4/9
    I have become basically familiar with the format and usage of dictionaries and the `def` function.
    1. Refine the while loop function using .isnumber()
    2. Functionize the error message

4/11
    1. Create a menu
    2. Organize part1 and the first half of part2 into functions for use in Menu option 1
    3. Create Menu option 2 function
    4. Change the Product_dict values to a list structure

4/12
    Complete Task 2 (Finish functionality for Menu options 1-4)
    Add a validity check to option 2 function

4/14
    Organize repeatedly used code blocks into other small functions (like clean_list_blank)
    Complete Task 3-1

4/17
    Complete Task 3-2, 3-3

4/18
    Complete Customer History function

4/19
    Add calculate_max_width function to automatically adjust the printing width of customer history fields

4/20
    Leave comments, adjust formatting, and rename variables to enhance readability.


'''